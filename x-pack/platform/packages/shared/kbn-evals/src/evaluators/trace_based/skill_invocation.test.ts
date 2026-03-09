/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSkillInvocationEvaluator } from './skill_invocation';
import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';

const VALID_TRACE_ID = '0af7651916cd43dd8448eb211c80319c';

const evaluateWith = (
  evaluator: ReturnType<typeof createSkillInvocationEvaluator>,
  traceId: string
) => evaluator.evaluate({ input: {}, output: { traceId }, expected: {}, metadata: {} });

describe('createSkillInvocationEvaluator', () => {
  let mockEsClient: jest.Mocked<EsClient>;
  let mockLog: jest.Mocked<ToolingLog>;

  beforeEach(() => {
    jest.useFakeTimers();
    mockEsClient = {
      esql: {
        query: jest.fn(),
      },
    } as any;

    mockLog = {
      error: jest.fn(),
      warning: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should build a query filtering by skill name in the filestore.read parameters', async () => {
    const evaluator = createSkillInvocationEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      skillName: 'data-exploration',
    });

    (mockEsClient.esql.query as jest.Mock).mockResolvedValue({
      columns: [{ name: 'skill_invoked', type: 'long' }],
      values: [[1]],
    });

    await evaluateWith(evaluator, VALID_TRACE_ID);

    const calledQuery = (mockEsClient.esql.query as jest.Mock).mock.calls[0][0].query;
    expect(calledQuery).toContain(`trace.id == "${VALID_TRACE_ID}"`);
    expect(calledQuery).toContain('attributes.gen_ai.tool.name == "filestore.read"');
    expect(calledQuery).toContain('*/data-exploration/SKILL.md*');
  });

  it('should return 1 when the skill was invoked', async () => {
    const evaluator = createSkillInvocationEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      skillName: 'data-exploration',
    });

    (mockEsClient.esql.query as jest.Mock).mockResolvedValue({
      columns: [{ name: 'skill_invoked', type: 'long' }],
      values: [[1]],
    });

    const result = await evaluateWith(evaluator, VALID_TRACE_ID);

    expect(result.score).toBe(1);
  });

  it('should return 0 when the skill was not invoked', async () => {
    const evaluator = createSkillInvocationEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      skillName: 'data-exploration',
    });

    (mockEsClient.esql.query as jest.Mock).mockResolvedValue({
      columns: [{ name: 'skill_invoked', type: 'long' }],
      values: [[0]],
    });

    const result = await evaluateWith(evaluator, VALID_TRACE_ID);

    expect(result.score).toBe(0);
  });

  it('should return 1 even when the skill was read multiple times', async () => {
    const evaluator = createSkillInvocationEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      skillName: 'data-exploration',
    });

    (mockEsClient.esql.query as jest.Mock).mockResolvedValue({
      columns: [{ name: 'skill_invoked', type: 'long' }],
      values: [[3]],
    });

    const result = await evaluateWith(evaluator, VALID_TRACE_ID);

    expect(result.score).toBe(1);
  });

  it('should include the skill name in the evaluator name', () => {
    const evaluator = createSkillInvocationEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      skillName: 'data-exploration',
    });

    expect(evaluator.name).toBe('Skill Invoked (data-exploration)');
  });

  it('should return unavailable when no traceId is present', async () => {
    const evaluator = createSkillInvocationEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      skillName: 'data-exploration',
    });

    const result = await evaluator.evaluate({
      input: {},
      output: {},
      expected: {},
      metadata: {},
    });

    expect(result.score).toBeNull();
    expect(result.label).toBe('unavailable');
  });

  it('should not match a different skill name in the path', async () => {
    const evaluator = createSkillInvocationEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      skillName: 'data-exploration',
    });

    (mockEsClient.esql.query as jest.Mock).mockResolvedValue({
      columns: [{ name: 'skill_invoked', type: 'long' }],
      values: [[0]],
    });

    const result = await evaluateWith(evaluator, VALID_TRACE_ID);

    expect(result.score).toBe(0);
  });
});
