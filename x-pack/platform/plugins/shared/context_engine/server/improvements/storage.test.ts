/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { Improvement } from '../../common/http_api/improvements';
import { IMPROVEMENTS_INDEX } from '../../common/http_api/improvements';
import {
  IMPROVEMENTS_INDEX_TEMPLATE,
  createImprovementsClient,
  improvementsSchema,
  installImprovementsIndexTemplate,
} from './storage';

interface MappingProp {
  type: string;
  enabled?: boolean;
  ignore_above?: number;
  index?: boolean;
  doc_values?: boolean;
  properties?: Record<string, MappingProp>;
}

const props = improvementsSchema.properties as unknown as Record<string, MappingProp>;

describe('improvements storage', () => {
  it('names a single global user index (not per-space, not a hidden system index)', () => {
    expect(IMPROVEMENTS_INDEX).toBe('context-engine-improvements');
    expect(IMPROVEMENTS_INDEX.startsWith('.')).toBe(false);
    expect(IMPROVEMENTS_INDEX).not.toMatch(/-$/);
  });

  it('indexes the append-log lineage fields so `list`/`get` can filter on the head', () => {
    expect(props.improvement_id.type).toBe('keyword');
    expect(props.revision_id.type).toBe('keyword');
    expect(props.previous_revision_id.type).toBe('keyword');
    expect(props.latest.type).toBe('boolean');
  });

  it('indexes the fields the review UI filters and sorts on', () => {
    expect(props.ai_index_id.type).toBe('keyword');
    expect(props.status.type).toBe('keyword');
    expect(props.action.type).toBe('keyword');
    expect(props['@timestamp'].type).toBe('date');
    expect(props.suggested_at.type).toBe('date');
    expect(props.applied_at.type).toBe('date');
    expect(props.rejected_at.type).toBe('date');
  });

  it('maps the human-facing copy as text', () => {
    expect(props.title.type).toBe('text');
    expect(props.rationale.type).toBe('text');
  });

  it('indexes the `target.*` ids as keywords, so "every suggestion touching workflow X" is queryable', () => {
    expect(props.target.type).toBe('object');
    for (const field of ['ki_id', 'workflow_id', 'subject'] as const) {
      expect(props.target.properties?.[field].type).toBe('keyword');
      expect(props.target.properties?.[field].index).not.toBe(false);
    }
  });

  it('keeps `target.source_value` out of the index, since it is unbounded and unqueried', () => {
    // An ES|QL source value can run past the adapter's default `ignore_above: 1024`, which would
    // silently stop indexing it; dedup keys off `improvement_id`, which hashes the value already.
    const sourceValue = props.target.properties?.source_value;
    expect(sourceValue?.index).toBe(false);
    expect(sourceValue?.doc_values).toBe(false);
  });

  it('keeps `payload` and `resolution` in _source without indexing them', () => {
    // Proposed KI content and workflow YAML run to several kilobytes; `flattened` with its
    // `ignore_above` would silently drop them, and nothing queries inside the change.
    expect(props.payload.type).toBe('object');
    expect(props.payload.enabled).toBe(false);
    expect(props.resolution.type).toBe('object');
    expect(props.resolution.enabled).toBe(false);
  });

  it('indexes provenance so the UI can drill back to the signals behind a suggestion', () => {
    const provenance = props.provenance.properties;
    expect(provenance?.agent_run_id.type).toBe('keyword');
    expect(provenance?.signal_ids.type).toBe('keyword');
    expect(provenance?.signal_spaces.type).toBe('keyword');
    expect(provenance?.tags.type).toBe('keyword');
    expect(provenance?.signal_count.type).toBe('long');
    expect(provenance?.signal_window.properties?.from.type).toBe('date');
    expect(provenance?.signal_window.properties?.to.type).toBe('date');
  });
});

describe('installImprovementsIndexTemplate', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggerMock.create();

  beforeEach(() => jest.clearAllMocks());

  it('ships the mappings as a template, leaving the index for the first write to create', async () => {
    await installImprovementsIndexTemplate({ esClient, logger });

    const [request] = esClient.indices.putIndexTemplate.mock.calls[0];
    expect(request).toEqual({
      name: IMPROVEMENTS_INDEX_TEMPLATE,
      index_patterns: [IMPROVEMENTS_INDEX],
      template: {
        mappings: { dynamic: 'strict', properties: improvementsSchema.properties },
      },
    });
    // Creating the index here would make it Kibana's; it is the user's write that creates it, so
    // the store needs no grant on the internal user.
    expect(esClient.indices.create).not.toHaveBeenCalled();
  });
});

describe('createImprovementsClient', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const client = createImprovementsClient(esClient);

  const document = { revision_id: 'rev-1' } as Improvement;

  beforeEach(() => jest.clearAllMocks());

  it('reads an index that may not exist yet, since an empty store is not an error', async () => {
    await client.search({ size: 1, query: { match_all: {} } });

    expect(esClient.search).toHaveBeenCalledWith({
      index: IMPROVEMENTS_INDEX,
      ignore_unavailable: true,
      size: 1,
      query: { match_all: {} },
    });
  });

  it('sends a bulk index with its document, carrying the OCC guard when one is given', async () => {
    esClient.bulk.mockResolvedValue({ errors: false, items: [], took: 1 });

    await client.bulk({
      operations: [
        { index: { _id: 'rev-1', document, if_seq_no: 4, if_primary_term: 1 } },
        { index: { _id: 'rev-2', document } },
      ],
      refresh: 'wait_for',
    });

    expect(esClient.bulk).toHaveBeenCalledWith({
      index: IMPROVEMENTS_INDEX,
      refresh: 'wait_for',
      operations: [
        { index: { _id: 'rev-1', if_seq_no: 4, if_primary_term: 1 } },
        document,
        { index: { _id: 'rev-2' } },
        document,
      ],
    });
  });

  it('throws on a failed item by default', async () => {
    esClient.bulk.mockResolvedValue({
      errors: true,
      took: 1,
      items: [
        {
          index: {
            _index: IMPROVEMENTS_INDEX,
            _id: 'rev-1',
            status: 409,
            error: { type: 'version_conflict' },
          },
        },
      ],
    });

    await expect(
      client.bulk({ operations: [{ index: { _id: 'rev-1', document } }] })
    ).rejects.toThrow(/version_conflict/);
  });

  it('hands the failures back when the caller opts out, since a conflict can be expected', async () => {
    const response = {
      errors: true,
      took: 1,
      items: [
        {
          index: {
            _index: IMPROVEMENTS_INDEX,
            _id: 'rev-1',
            status: 409,
            error: { type: 'version_conflict' },
          },
        },
      ],
    };
    esClient.bulk.mockResolvedValue(response);

    await expect(
      client.bulk({ operations: [{ index: { _id: 'rev-1', document } }], throwOnFail: false })
    ).resolves.toBe(response);
  });
});
