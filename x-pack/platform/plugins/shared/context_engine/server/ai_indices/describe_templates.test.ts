/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  MAX_AI_INDEX_QUERY_TEMPLATES,
  MAX_AI_INDEX_QUERY_TEMPLATES_BYTES,
  MAX_AI_INDEX_QUERY_TEMPLATE_ESQL_LENGTH,
} from '../../common/constants';
import type { AiIndexField } from '../../common/http_api/ai_indices';
import { describeAiIndexQueryTemplates } from './describe_templates';
import { executeScopedEsql } from './query';

jest.mock('./query');

const executeScopedEsqlMock = jest.mocked(executeScopedEsql);

const field = (path: string, type: string): AiIndexField => ({
  path,
  type,
  searchable: true,
  aggregatable: type !== 'text',
});

const kiFields = [
  field('@timestamp', 'date'),
  field('attributes', 'flattened'),
  field('description', 'text'),
  field('title', 'text'),
];

const columns = ['_id', 'title', 'description', 'esql'].map((name) => ({
  name,
  type: 'keyword',
}));
const row = (id: string, title: string | null, description: string | null, esql: string) => [
  id,
  title,
  description,
  esql,
];

describe('describeAiIndexQueryTemplates', () => {
  const esClient = {} as ElasticsearchClient;
  const params = { esClient, target: 'ai-index-idx-*', spaceId: 'team-a', fields: kiFields };

  beforeEach(() => {
    executeScopedEsqlMock.mockReset();
    executeScopedEsqlMock.mockResolvedValue({ columns, values: [] });
  });

  it('returns nothing without querying when attributes is not flattened', async () => {
    const result = await describeAiIndexQueryTemplates({
      ...params,
      fields: [field('title', 'text'), field('attributes', 'object')],
    });

    expect(executeScopedEsqlMock).not.toHaveBeenCalled();
    expect(result).toEqual({ query_templates: [], truncated: false });
  });

  it('extracts, expands and sorts attributes.esql, refusing partial results', async () => {
    await describeAiIndexQueryTemplates(params);

    expect(executeScopedEsqlMock).toHaveBeenCalledWith({
      esClient,
      spaceId: 'team-a',
      limit: MAX_AI_INDEX_QUERY_TEMPLATES + 1,
      allowPartialResults: false,
      query: [
        'FROM ai-index-idx-* METADATA _id',
        '| EVAL esql = FIELD_EXTRACT(`attributes`, "esql")',
        '| WHERE esql IS NOT NULL',
        '| MV_EXPAND esql',
        '| SORT `@timestamp` DESC NULLS LAST, _id ASC, esql ASC',
        '| KEEP _id, `title`, `description`, esql',
      ].join('\n'),
    });
    const { query } = executeScopedEsqlMock.mock.calls[0][0];
    expect(Parser.parse(query).errors).toEqual([]);
  });

  it('treats conflicting optional columns as absent', async () => {
    await describeAiIndexQueryTemplates({
      ...params,
      fields: [
        field('attributes', 'flattened'),
        field('title', 'conflict'),
        field('description', 'text'),
      ],
    });

    const { query } = executeScopedEsqlMock.mock.calls[0][0];
    expect(query).toContain('| KEEP _id, `description`, esql');
    expect(query).not.toContain('`title`');
  });

  it('drops the timestamp sort and absent columns when the mapping lacks them', async () => {
    await describeAiIndexQueryTemplates({ ...params, fields: [field('attributes', 'flattened')] });

    const { query } = executeScopedEsqlMock.mock.calls[0][0];
    expect(query).toContain('| SORT _id ASC, esql ASC\n| KEEP _id, esql');
    expect(Parser.parse(query).errors).toEqual([]);
  });

  it('maps rows to templates in response order', async () => {
    executeScopedEsqlMock.mockResolvedValue({
      columns,
      values: [
        row('ki-1', 'Errors', 'Recent errors', 'FROM logs-* | LIMIT 5'),
        row('ki-2', 'Multi', null, 'FROM a'),
        row('ki-2', 'Multi', null, 'FROM b'),
      ],
    });

    const result = await describeAiIndexQueryTemplates(params);

    expect(result).toEqual({
      query_templates: [
        {
          ki_id: 'ki-1',
          title: 'Errors',
          description: 'Recent errors',
          esql: 'FROM logs-* | LIMIT 5',
        },
        { ki_id: 'ki-2', title: 'Multi', esql: 'FROM a' },
        { ki_id: 'ki-2', title: 'Multi', esql: 'FROM b' },
      ],
      truncated: false,
    });
  });

  it('tolerates columns dropped as all-null and falls back to the id as title', async () => {
    executeScopedEsqlMock.mockResolvedValue({
      columns: columns.filter(({ name }) => name === '_id' || name === 'esql'),
      values: [['ki-1', 'FROM ok']],
    });

    const result = await describeAiIndexQueryTemplates(params);

    expect(result.query_templates).toEqual([{ ki_id: 'ki-1', title: 'ki-1', esql: 'FROM ok' }]);
  });

  it('skips rows without a usable id or esql', async () => {
    executeScopedEsqlMock.mockResolvedValue({
      columns,
      values: [row('ki-1', null, null, ''), [null, null, null, 'FROM orphan']],
    });

    const result = await describeAiIndexQueryTemplates(params);

    expect(result).toEqual({ query_templates: [], truncated: false });
  });

  it('clips an over-long esql and reports truncation', async () => {
    const esql = 'x'.repeat(MAX_AI_INDEX_QUERY_TEMPLATE_ESQL_LENGTH + 10);
    executeScopedEsqlMock.mockResolvedValue({ columns, values: [row('ki-1', null, null, esql)] });

    const result = await describeAiIndexQueryTemplates(params);

    expect(result.query_templates[0].esql).toHaveLength(MAX_AI_INDEX_QUERY_TEMPLATE_ESQL_LENGTH);
    expect(result.truncated).toBe(true);
  });

  it('caps the template count and flags truncation when an extra row comes back', async () => {
    executeScopedEsqlMock.mockResolvedValue({
      columns,
      values: Array.from({ length: MAX_AI_INDEX_QUERY_TEMPLATES + 1 }, (_, i) =>
        row(`ki-${i}`, null, null, 'FROM a')
      ),
    });

    const result = await describeAiIndexQueryTemplates(params);

    expect(result.query_templates).toHaveLength(MAX_AI_INDEX_QUERY_TEMPLATES);
    expect(result.truncated).toBe(true);
  });

  it('keeps the serialized array within the byte cap', async () => {
    const esql = 'x'.repeat(MAX_AI_INDEX_QUERY_TEMPLATE_ESQL_LENGTH);
    const perTemplate = Buffer.byteLength(JSON.stringify({ ki_id: 'ki-00', title: 'ki-00', esql }));
    // n entries serialize to n * (perTemplate + 1) + 1 bytes.
    const fitting = Math.floor((MAX_AI_INDEX_QUERY_TEMPLATES_BYTES - 1) / (perTemplate + 1));
    executeScopedEsqlMock.mockResolvedValue({
      columns,
      values: Array.from({ length: fitting + 1 }, (_, i) =>
        row(`ki-${String(i).padStart(2, '0')}`, null, null, esql)
      ),
    });

    const result = await describeAiIndexQueryTemplates(params);

    expect(result.query_templates).toHaveLength(fitting);
    expect(result.truncated).toBe(true);
    expect(Buffer.byteLength(JSON.stringify(result.query_templates))).toBeLessThanOrEqual(
      MAX_AI_INDEX_QUERY_TEMPLATES_BYTES
    );
  });

  it('propagates query errors', async () => {
    executeScopedEsqlMock.mockRejectedValue(new Error('boom'));

    await expect(describeAiIndexQueryTemplates(params)).rejects.toThrow('boom');
  });
});
