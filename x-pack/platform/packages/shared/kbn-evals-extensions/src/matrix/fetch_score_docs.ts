/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The subset of a golden score document the replay path reads. Only the fields
 * a judge needs are modelled; everything else on the doc is ignored.
 */
export interface RawScoreDoc {
  metadata?: { execution_id?: string; suite_id?: string };
  task?: {
    model?: { id?: string };
    output?: { messages?: Array<{ message?: { content?: unknown } }> };
  };
  example?: { id?: string; input?: { question?: string } };
}

const SCORES_INDEX = '.ds-.evaluation-scores*';
// One collapsed hit per execution. The published matrix spans ~20 models, and
// an unscoped suite query matches ~155 historical executions whose task.output
// payloads total ~7 MB per example (~56 min for 21 examples). Callers scope by
// execution id or model, so this only has to bound a pathological request.
const PAGE_SIZE = 200;

/**
 * Reads score documents directly from Elasticsearch.
 *
 * The golden cluster archives evaluation scores but does not run the evals
 * plugin, so `/internal/evals/*` answers 400 there. Replay therefore talks to
 * the index the sweeps write to. `task.output` is in `_source` but is NOT
 * indexed, so it can be read but never filtered on.
 */
export const fetchScoreDocs = async ({
  esUrl,
  apiKey,
  exampleIds,
  executionIds,
  modelIds,
  configModelIds,
  suiteIds,
  asOf,
}: {
  esUrl: string;
  apiKey: string;
  exampleIds: string[];
  executionIds?: string[];
  modelIds?: string[];
  configModelIds?: string[];
  suiteIds?: string[];
  asOf?: number;
}): Promise<RawScoreDoc[]> => {
  const filter: unknown[] = [];

  // Without a suite filter the query scans every suite ever archived (~2M docs
  // on the golden cluster) and never returns.
  if (suiteIds?.length) {
    filter.push({ terms: { 'metadata.suite_id': suiteIds } });
  }

  if (asOf) {
    filter.push({ range: { '@timestamp': { lt: new Date(asOf).toISOString() } } });
  }

  if (executionIds?.length) {
    filter.push({ terms: { 'metadata.execution_id': executionIds } });
  }

  const models = modelIds?.length ? modelIds : configModelIds;
  if (models?.length) {
    filter.push({ terms: { 'task.model.id': models } });
  }

  // Refuse an unbounded archive read. Without a model or execution scope this
  // matches every historical run of the suite, which is minutes of transfer and
  // almost never what the caller meant.
  if (!executionIds?.length && !models?.length) {
    throw new Error(
      'fetchScoreDocs requires --execution-id or --models (or a config model list): ' +
        'an unscoped query reads every archived run of the suite.'
    );
  }

  // One request per example, collapsed to one document per execution.
  //
  // A trajectory is stored once per evaluator (~15 docs), so scrolling the raw
  // index reads ~42k documents to recover ~2.8k trajectories and takes minutes.
  // `collapse` makes Elasticsearch return the single representative document
  // the judge needs, which is both correct and ~100x cheaper.
  const docs: RawScoreDoc[] = [];

  for (const exampleId of exampleIds) {
    const response = await fetch(`${esUrl.replace(/\/$/, '')}/${SCORES_INDEX}/_search`, {
      method: 'POST',
      headers: {
        Authorization: `ApiKey ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        size: PAGE_SIZE,
        track_total_hits: false,
        query: { bool: { filter: [...filter, { term: { 'example.id': exampleId } }] } },
        collapse: { field: 'metadata.execution_id' },
        _source: [
          'metadata.execution_id',
          'metadata.suite_id',
          'task.model.id',
          'task.output',
          'example.id',
          'example.input',
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Score query failed: ${response.status} ${await response.text()}`);
    }

    const parsed = (await response.json()) as {
      hits?: { hits?: Array<{ _source?: RawScoreDoc }> };
    };

    for (const hit of parsed.hits?.hits ?? []) {
      if (hit._source) {
        docs.push(hit._source);
      }
    }
  }

  return docs;
};
