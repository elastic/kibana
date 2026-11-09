/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { ES_TEST_DATASETS } from '../corpora/es_test_data';

/**
 * Expert-authored examples: real ES|QL written by people, mined from sources we can actually
 * reach.
 *
 * We have no production traffic to mine, so the realistic middle ground between the 34
 * hand-written anchors and a fully synthetic corpus is query text that an engineer wrote for a
 * purpose — Elasticsearch's own ES|QL spec tests, and Elastic's published detection rules. The
 * gold is human-authored; only the question has to be reconstructed.
 */
export interface ExpertCandidate {
  /** Human-written query, rewritten only to point at an index we have. */
  query: string;
  /** Whatever intent text the source carried: a test name, or a rule name and description. */
  intent: string;
  index: string;
  source: 'es-spec' | 'detection-rule';
  rowCount: number;
}

const stripComments = (text: string): string =>
  text
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n')
    .trim();

/**
 * Pull `FROM employees` statements out of Elasticsearch's `.csv-spec` fixtures.
 *
 * The format is: a test name on its own line, optional `required_capability:` lines, then the
 * query terminated by a semicolon, then the expected result block. Only the query and the name
 * are of interest here.
 */
const FROM_PATTERN = new RegExp(
  `^from\\s+(${ES_TEST_DATASETS.map((dataset) => dataset.from).join('|')})\\b`,
  'i'
);

export const parseEsSpecQueries = (specText: string): Array<{ name: string; query: string }> => {
  const results: Array<{ name: string; query: string }> = [];
  const blocks = specText.split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.split('\n');
    const name = lines[0]?.trim();
    if (!name || name.includes(':') || name.startsWith('//')) continue;

    const body = stripComments(lines.slice(1).join('\n'));
    const [statement] = body.split(';');
    if (!statement) continue;

    const query = statement
      .split('\n')
      .filter((line) => !line.trim().startsWith('required_capability'))
      .join('\n')
      .trim();

    if (FROM_PATTERN.test(query)) {
      results.push({ name, query });
    }
  }

  return results;
};

const HARD_SHAPES =
  /\b(STATS|EVAL|CASE|DISSECT|GROK|PERCENTILE|MEDIAN|BUCKET|COUNT_DISTINCT|MV_|DATE_|RLIKE|CIDR_MATCH)\b/i;

const QUERY_IS_INTERESTING = (query: string): boolean => {
  const pipes = (query.match(/\|/g) ?? []).length;
  // One-stage queries, and multi-stage ones that only sort and project, are the shapes the
  // corpus is already saturated on. The value in these sources is their computation.
  if (pipes < 2) return false;
  if (!HARD_SHAPES.test(query)) return false;
  if (query.length > 500) return false;
  // Joins and enrich need policies and lookup indices we do not have.
  return !/LOOKUP\s+JOIN|ENRICH|INLINE\s*STATS/i.test(query);
};

export const collectEsSpecCandidates = ({
  esRepo,
  limit,
}: {
  esRepo: string;
  limit: number;
}): ExpertCandidate[] => {
  const dir = Path.join(esRepo, 'x-pack/plugin/esql/qa/testFixtures/src/main/resources');
  const candidates: ExpertCandidate[] = [];
  const seen = new Set<string>();
  // Per-dataset budget: the suite is dominated by `employees`, and taking the first N queries
  // produced a corpus about one index, which teaches the harness one schema.
  const perDataset = Math.max(Math.ceil(limit / ES_TEST_DATASETS.length), 5);
  const takenByIndex = new Map<string, number>();

  for (const file of Fs.readdirSync(dir).filter((name) => name.endsWith('.csv-spec'))) {
    for (const { name, query } of parseEsSpecQueries(
      Fs.readFileSync(Path.join(dir, file), 'utf8')
    )) {
      if (!QUERY_IS_INTERESTING(query)) continue;
      const dataset = ES_TEST_DATASETS.find((entry) =>
        new RegExp(`^from\\s+${entry.from}\\b`, 'i').test(query)
      );
      if (!dataset) continue;
      const rewritten = query.replace(
        new RegExp(`^from\\s+${dataset.from}\\b`, 'i'),
        `FROM ${dataset.index}`
      );
      if (seen.has(rewritten)) continue;
      if ((takenByIndex.get(dataset.index) ?? 0) >= perDataset) continue;
      seen.add(rewritten);
      takenByIndex.set(dataset.index, (takenByIndex.get(dataset.index) ?? 0) + 1);
      candidates.push({
        query: rewritten,
        intent: `${file.replace('.csv-spec', '')}: ${name}`,
        index: dataset.index,
        source: 'es-spec',
        rowCount: 0,
      });
      if (candidates.length >= limit) return candidates;
    }
  }

  return candidates;
};

/** Fields the fixture `logs-*` index actually has; a rule using anything else cannot run. */
const LOGS_FIELDS = [
  '@timestamp',
  'event.type',
  'host.os.type',
  'process.executable',
  'process.args',
  'process.command_line',
  'process.parent.name',
  'file.path',
  'bytes_transferred',
  'command_line',
  'destination.ip',
  'destination.port',
  'destination.address',
  'dns.question.name',
  'error_code',
  'event.action',
  'event.category',
  'event.code',
  'file.name',
  'group.name',
  'host.name',
  'ip',
  'log.message',
  'network.bytes',
  'network.direction',
  'process.name',
  'process.working_directory',
  'source.ip',
  'source.bytes',
  'url.domain',
  'url.path',
  'user.name',
  'user_agent.original',
];

const FIELD_PATTERN = /\b([a-z_][a-z0-9_]*(?:\.[a-z0-9_]+)+)\b/gi;

/**
 * Detection rules whose queries only touch fields the fixtures have.
 *
 * Rewriting the index is fair — the rule's analytic intent does not depend on which concrete
 * data stream it ships against — but inventing fields is not, so a rule that references
 * anything the fixture lacks is dropped rather than patched.
 */
export const collectDetectionRuleCandidates = ({
  rulesRepo,
  limit,
}: {
  rulesRepo: string;
  limit: number;
}): ExpertCandidate[] => {
  const candidates: ExpertCandidate[] = [];
  const walk = (dir: string): string[] =>
    Fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const absolute = Path.join(dir, entry.name);
      return entry.isDirectory() ? walk(absolute) : absolute.endsWith('.toml') ? [absolute] : [];
    });

  for (const file of walk(Path.join(rulesRepo, 'rules'))) {
    const text = Fs.readFileSync(file, 'utf8');
    if (!text.includes('language = "esql"')) continue;

    const name = text.match(/\nname = "([^"]+)"/)?.[1];
    const description = text.match(/\ndescription = """([\s\S]*?)"""/)?.[1]?.trim();
    const query = text.match(/\nquery = '''([\s\S]*?)'''/)?.[1]?.trim();
    if (!name || !query) continue;
    if (!QUERY_IS_INTERESTING(query)) continue;

    const fields = [...query.matchAll(FIELD_PATTERN)].map((match) => match[1]);
    const usable = fields.every(
      (field) => LOGS_FIELDS.includes(field) || field.startsWith('metadata.')
    );
    if (!usable || fields.length === 0) continue;

    candidates.push({
      query: query.replace(/^from\s+[^\n|]+/i, 'FROM logs-*'),
      intent: description ? `${name}. ${description.split('\n')[0]}` : name,
      index: 'logs-*',
      source: 'detection-rule',
      rowCount: 0,
    });
    if (candidates.length >= limit) break;
  }

  return candidates;
};

/** Keep the candidates that run against the corpus and return something worth comparing. */
export const filterExecutable = async ({
  esClient,
  candidates,
  limit,
  log,
}: {
  esClient: EsClient;
  candidates: ExpertCandidate[];
  limit: number;
  log: ToolingLog;
}): Promise<ExpertCandidate[]> => {
  const kept: ExpertCandidate[] = [];
  const fingerprints = new Set<string>();

  for (const candidate of candidates) {
    if (kept.length >= limit) break;
    try {
      const result = (await esClient.esql.query({ query: candidate.query })) as {
        values?: unknown[][];
      };
      const values = result.values ?? [];
      if (values.length === 0) continue;
      const fingerprint = JSON.stringify(values).slice(0, 400);
      if (fingerprints.has(fingerprint)) continue;
      fingerprints.add(fingerprint);
      kept.push({ ...candidate, rowCount: values.length });
    } catch (e) {
      // a query that needs data we do not have is simply not a candidate
    }
  }

  log.info(`[expert] ${kept.length} of ${candidates.length} candidate queries execute`);
  return kept;
};
