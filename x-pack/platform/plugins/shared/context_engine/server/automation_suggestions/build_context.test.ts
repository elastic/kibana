/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import type { AiIndexHttpItem } from '../../common/http_api/ai_indices';
import { describeAiIndexFields } from '../ai_indices/describe_fields';
import { countEsqlRows, previewEsqlQuery } from '../ai_indices/esql_preview';
import { selectSignals } from '../feedback_analysis/select_signals';
import type { WorkflowEnablementApi } from '../feedback_analysis/schedule';
import { buildAutomationSuggestionContext } from './build_context';

jest.mock('../ai_indices/describe_fields');
jest.mock('../ai_indices/esql_preview');
jest.mock('../feedback_analysis/select_signals');

const describeAiIndexFieldsMock = describeAiIndexFields as jest.MockedFunction<
  typeof describeAiIndexFields
>;
const previewEsqlQueryMock = previewEsqlQuery as jest.MockedFunction<typeof previewEsqlQuery>;
const countEsqlRowsMock = countEsqlRows as jest.MockedFunction<typeof countEsqlRows>;
const selectSignalsMock = selectSignals as jest.MockedFunction<typeof selectSignals>;

const buildAiIndex = (overrides: Partial<AiIndexHttpItem> = {}): AiIndexHttpItem =>
  ({
    id: 'support',
    dest: { type: 'index', value: 'ai-index-idx-support' },
    sources: [{ type: 'esql', value: 'FROM tickets' }],
    automations: [{ type: 'workflow', value: 'wf-1' }],
    traces: [{ type: 'esql', value: 'FROM traces-*', query: 'FROM traces-*' }],
    ...overrides,
  } as unknown as AiIndexHttpItem);

describe('buildAutomationSuggestionContext', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const request = httpServerMock.createKibanaRequest();

  beforeEach(() => {
    jest.clearAllMocks();
    selectSignalsMock.mockResolvedValue({
      patterns: [],
      spaces: [],
      signalCount: 0,
      window: { from: 'now-30d', to: 'now' },
    });
  });

  it('inspects every esql source with its mapping and a document sample', async () => {
    describeAiIndexFieldsMock.mockResolvedValue({
      fields: [],
      allFields: [{ path: 'subject', type: 'text', searchable: true, aggregatable: false }],
      semanticFields: [],
      omittedFieldCount: 0,
    });
    previewEsqlQueryMock.mockResolvedValue({
      row_count: 10,
      sample_rows: [{ subject: 'Cannot log in' }],
    });

    const result = await buildAutomationSuggestionContext(buildAiIndex(), {
      esClient,
      spaceId: 'default',
      request,
    });

    expect(result.sources).toEqual([
      {
        type: 'esql',
        value: 'FROM tickets',
        row_count: 10,
        sample_documents: [{ subject: 'Cannot log in' }],
        fields: [{ path: 'subject', type: 'text', searchable: true, aggregatable: false }],
      },
    ]);
    expect(describeAiIndexFieldsMock).toHaveBeenCalledWith({ esClient, target: 'tickets' });
    expect(previewEsqlQueryMock).toHaveBeenCalledWith(esClient, 'FROM tickets', 5);
  });

  it('does not inspect a connector source', async () => {
    const result = await buildAutomationSuggestionContext(
      buildAiIndex({ sources: [{ type: 'connector', value: 'my-connector' }] }),
      { esClient, spaceId: 'default', request }
    );

    expect(result.sources).toEqual([{ type: 'connector', value: 'my-connector' }]);
    expect(previewEsqlQueryMock).not.toHaveBeenCalled();
    expect(describeAiIndexFieldsMock).not.toHaveBeenCalled();
  });

  it('records an inspection_error rather than failing the whole context when a source query fails', async () => {
    previewEsqlQueryMock.mockRejectedValue(new Error('index not found'));
    describeAiIndexFieldsMock.mockResolvedValue({
      fields: [],
      allFields: [],
      semanticFields: [],
      omittedFieldCount: 0,
    });

    const result = await buildAutomationSuggestionContext(buildAiIndex(), {
      esClient,
      spaceId: 'default',
      request,
    });

    expect(result.sources).toEqual([
      { type: 'esql', value: 'FROM tickets', inspection_error: 'index not found' },
    ]);
  });

  it('reads the full definition of every existing automation', async () => {
    const getWorkflow = jest.fn().mockResolvedValue({ yaml: 'name: wf-1' });
    const workflows: WorkflowEnablementApi = {
      updateWorkflow: jest.fn(),
      getWorkflow,
    };

    const result = await buildAutomationSuggestionContext(buildAiIndex(), {
      esClient,
      spaceId: 'default',
      request,
      workflows,
    });

    expect(result.automations).toEqual([{ type: 'workflow', value: 'wf-1', yaml: 'name: wf-1' }]);
    expect(getWorkflow).toHaveBeenCalledWith('wf-1', 'default', request);
  });

  it('records a fetch_error when an automation cannot be read, and when workflows is unavailable', async () => {
    const workflows: WorkflowEnablementApi = {
      updateWorkflow: jest.fn(),
      getWorkflow: jest.fn().mockResolvedValue(null),
    };

    const withWorkflows = await buildAutomationSuggestionContext(buildAiIndex(), {
      esClient,
      spaceId: 'default',
      request,
      workflows,
    });
    expect(withWorkflows.automations).toEqual([
      { type: 'workflow', value: 'wf-1', fetch_error: 'Workflow was not found.' },
    ]);

    const withoutWorkflows = await buildAutomationSuggestionContext(buildAiIndex(), {
      esClient,
      spaceId: 'default',
      request,
    });
    expect(withoutWorkflows.automations).toEqual([
      {
        type: 'workflow',
        value: 'wf-1',
        fetch_error: 'Workflows management is not available.',
      },
    ]);
  });

  it('counts each configured trace', async () => {
    countEsqlRowsMock.mockResolvedValue(128);

    const result = await buildAutomationSuggestionContext(buildAiIndex(), {
      esClient,
      spaceId: 'default',
      request,
    });

    expect(result.traces).toEqual([
      { type: 'esql', value: 'FROM traces-*', query: 'FROM traces-*', row_count: 128 },
    ]);
  });

  it('records a count_error rather than failing when a trace count fails', async () => {
    countEsqlRowsMock.mockRejectedValue(new Error('timeout'));

    const result = await buildAutomationSuggestionContext(buildAiIndex(), {
      esClient,
      spaceId: 'default',
      request,
    });

    expect(result.traces).toEqual([
      { type: 'esql', value: 'FROM traces-*', query: 'FROM traces-*', count_error: 'timeout' },
    ]);
  });

  it('summarizes signals by tag', async () => {
    selectSignalsMock.mockResolvedValue({
      patterns: [
        { tag: 'coverage_gap', target_index: 'tickets', tool: 'execute_esql', count: 2, signal_ids: ['a'] },
        { tag: 'coverage_gap', target_index: 'tickets', tool: 'execute_esql', count: 1, signal_ids: ['b'] },
        { tag: 'empty_retrieval', target_index: 'tickets', tool: 'execute_esql', count: 3, signal_ids: ['c'] },
      ],
      spaces: ['default'],
      signalCount: 6,
      window: { from: 'now-30d', to: 'now' },
    });

    const result = await buildAutomationSuggestionContext(buildAiIndex(), {
      esClient,
      spaceId: 'default',
      request,
    });

    expect(result.signals_summary).toEqual({
      total: 6,
      by_tag: [
        { tag: 'coverage_gap', count: 3 },
        { tag: 'empty_retrieval', count: 3 },
      ],
    });
  });
});
