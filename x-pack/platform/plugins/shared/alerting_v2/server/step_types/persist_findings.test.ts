/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { RULE_DOCTOR_INSIGHTS_INDEX } from '../resources/indices/rule_doctor_insights';
import { persistFindingsStepDefinition } from './persist_findings';

const mockEsClient = {
  bulk: jest.fn(),
};

interface MockInput {
  insights: unknown[];
  dismiss_ids: string[];
  space_id: string;
}

const createMockContext = () => ({
  input: {
    insights: [],
    dismiss_ids: [],
    space_id: 'default',
  } as MockInput,
  config: {},
  rawInput: {} as any,
  contextManager: {
    getScopedEsClient: () => mockEsClient,
    getContext: jest.fn(),
    renderInputTemplate: jest.fn(),
    getFakeRequest: jest.fn(),
  },
  logger: loggingSystemMock.createLogger(),
  abortSignal: new AbortController().signal,
  stepId: 'persist_results',
  stepType: 'alerting_v2.persist_findings',
});

const makeInsight = (overrides: Record<string, unknown> = {}) => ({
  '@timestamp': '2026-04-28T00:00:00.000Z',
  insight_id: 'insight-1',
  execution_id: 'exec-1',
  status: 'open' as const,
  type: 'deduplication',
  action: 'merge',
  impact: 'high' as const,
  confidence: 'high' as const,
  title: 'Duplicate rules',
  summary: 'Rules are duplicates',
  justification: 'Same query and conditions',
  rule_ids: ['rule-1', 'rule-2'],
  current: null,
  proposed: null,
  space_id: 'default',
  ...overrides,
});

describe('persist_findings step', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has the correct step id', () => {
    expect(persistFindingsStepDefinition.id).toBe('alerting_v2.persist_findings');
  });

  it('bulk indexes insights via the insights client', async () => {
    const context = createMockContext();
    const insight = makeInsight();
    context.input.insights = [insight];

    mockEsClient.bulk.mockResolvedValueOnce({
      errors: false,
      items: [{ index: { _id: 'default:insight-1', status: 201 } }],
    });

    const result = await persistFindingsStepDefinition.handler(context as any);

    expect(mockEsClient.bulk).toHaveBeenCalledWith({
      operations: [
        { index: { _index: RULE_DOCTOR_INSIGHTS_INDEX, _id: 'default:insight-1' } },
        insight,
      ],
      refresh: false,
    });
    expect(result.output).toEqual({ indexed: 1, failed: 0, dismissed: 0 });
  });

  it('dismisses insights via the insights client', async () => {
    const context = createMockContext();
    context.input.dismiss_ids = ['old-insight-1', 'old-insight-2'];

    mockEsClient.bulk.mockResolvedValueOnce({
      errors: false,
      items: [
        { update: { _id: 'default:old-insight-1', status: 200 } },
        { update: { _id: 'default:old-insight-2', status: 200 } },
      ],
    });

    const result = await persistFindingsStepDefinition.handler(context as any);

    expect(mockEsClient.bulk).toHaveBeenCalledWith({
      operations: [
        { update: { _index: RULE_DOCTOR_INSIGHTS_INDEX, _id: 'default:old-insight-1' } },
        { doc: { status: 'dismissed' } },
        { update: { _index: RULE_DOCTOR_INSIGHTS_INDEX, _id: 'default:old-insight-2' } },
        { doc: { status: 'dismissed' } },
      ],
      refresh: 'wait_for',
    });
    expect(result.output).toEqual({ indexed: 0, failed: 0, dismissed: 2 });
  });

  it('returns zeros when no insights or dismiss_ids provided', async () => {
    const context = createMockContext();

    const result = await persistFindingsStepDefinition.handler(context as any);

    expect(mockEsClient.bulk).not.toHaveBeenCalled();
    expect(result.output).toEqual({ indexed: 0, failed: 0, dismissed: 0 });
  });

  it('reports failed count on bulk errors', async () => {
    const context = createMockContext();
    context.input.insights = [makeInsight(), makeInsight({ insight_id: 'insight-2' })];

    mockEsClient.bulk.mockResolvedValueOnce({
      errors: true,
      items: [
        { index: { _id: 'default:insight-1', status: 201 } },
        {
          index: {
            _id: 'default:insight-2',
            status: 400,
            error: { type: 'mapper_parsing_exception', reason: 'bad field' },
          },
        },
      ],
    });

    const result = await persistFindingsStepDefinition.handler(context as any);

    expect(result.output).toEqual({ indexed: 1, failed: 1, dismissed: 0 });
  });
});
