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

  it('should build a query filtering by skill name in the load_skill and filestore.read parameters', async () => {
    const evaluator = createSkillInvocationEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      skillName: 'data-exploration',
    });

    (mockEsClient.esql.query as jest.Mock).mockResolvedValue({
      columns: [
        { name: 'total_spans', type: 'long' },
        { name: 'agent_spans', type: 'long' },
        { name: 'total_tool_spans', type: 'long' },
        { name: 'skill_invoked', type: 'long' },
      ],
      values: [[50, 1, 1, 1]],
    });

    await evaluateWith(evaluator, VALID_TRACE_ID);

    const calledQuery = (mockEsClient.esql.query as jest.Mock).mock.calls[0][0].query;
    expect(calledQuery).toContain(`trace.id == "${VALID_TRACE_ID}"`);
    expect(calledQuery).toContain('total_spans = COUNT(*)');
    // The run's root span is the completion signal: without it a partially indexed trace
    // would be scored 0 instead of being retried.
    expect(calledQuery).toContain('agent_spans = COUNT(');
    expect(calledQuery).toContain('attributes.elastic.inference.span.kind == "AGENT"');
    expect(calledQuery).toContain('attributes.elastic.inference.span.kind == "TOOL"');
    expect(calledQuery).toContain('attributes.gen_ai.tool.name == "load_skill"');
    expect(calledQuery).toContain('attributes.gen_ai.tool.name == "filestore.read"');
    expect(calledQuery).toContain('*/data-exploration/SKILL.md*');
    // `load_skill` also accepts the skill's folder path, which ends at the folder name rather
    // than at SKILL.md — a valid load that would otherwise score 0.
    expect(calledQuery).toContain('*\\"skill\\":\\"*/data-exploration\\"*');
    // A SKILL.md read through the current `read_file` id is the same load as the legacy
    // `filestore.read` id, and the suite's trajectory filter treats both as one.
    expect(calledQuery.replace(/\s+/g, ' ')).toContain(
      '( attributes.gen_ai.tool.name == "filestore.read" OR attributes.gen_ai.tool.name == "read_file" ) AND attributes.gen_ai.tool.call.arguments LIKE "*/data-exploration/SKILL.md*"'
    );
  });

  it('anchors the load_skill argument to the configured skill name', async () => {
    const evaluator = createSkillInvocationEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      skillName: 'data-exploration',
    });

    (mockEsClient.esql.query as jest.Mock).mockResolvedValue({
      columns: [
        { name: 'total_spans', type: 'long' },
        { name: 'agent_spans', type: 'long' },
        { name: 'total_tool_spans', type: 'long' },
        { name: 'skill_invoked', type: 'long' },
      ],
      values: [[50, 1, 1, 1]],
    });

    await evaluateWith(evaluator, VALID_TRACE_ID);

    const calledQuery = (mockEsClient.esql.query as jest.Mock).mock.calls[0][0].query;
    // Arguments are compact JSON of the tool's parameters, so the value is delimited by quotes:
    // `{"skill":"data-exploration"}` matches, `{"skill":"data-exploration-v2"}` does not.
    expect(calledQuery).toContain('*\\"skill\\":\\"data-exploration\\"*');
    expect(calledQuery).not.toContain('LIKE "*data-exploration*"');
  });

  it('should return 1 when the skill was invoked', async () => {
    const evaluator = createSkillInvocationEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      skillName: 'data-exploration',
    });

    (mockEsClient.esql.query as jest.Mock).mockResolvedValue({
      columns: [
        { name: 'total_spans', type: 'long' },
        { name: 'agent_spans', type: 'long' },
        { name: 'total_tool_spans', type: 'long' },
        { name: 'skill_invoked', type: 'long' },
      ],
      values: [[50, 1, 2, 1]],
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
      columns: [
        { name: 'total_spans', type: 'long' },
        { name: 'agent_spans', type: 'long' },
        { name: 'total_tool_spans', type: 'long' },
        { name: 'skill_invoked', type: 'long' },
      ],
      values: [[50, 1, 2, 0]],
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
      columns: [
        { name: 'total_spans', type: 'long' },
        { name: 'agent_spans', type: 'long' },
        { name: 'total_tool_spans', type: 'long' },
        { name: 'skill_invoked', type: 'long' },
      ],
      values: [[50, 1, 4, 3]],
    });

    const result = await evaluateWith(evaluator, VALID_TRACE_ID);

    expect(result.score).toBe(1);
  });

  it('should retry until spans are visible in the trace data', async () => {
    const evaluator = createSkillInvocationEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      skillName: 'data-exploration',
    });

    (mockEsClient.esql.query as jest.Mock)
      .mockResolvedValueOnce({
        columns: [
          { name: 'total_spans', type: 'long' },
          { name: 'agent_spans', type: 'long' },
          { name: 'total_tool_spans', type: 'long' },
          { name: 'skill_invoked', type: 'long' },
        ],
        values: [[0, 0, 0, 0]],
      })
      .mockResolvedValueOnce({
        columns: [
          { name: 'total_spans', type: 'long' },
          { name: 'agent_spans', type: 'long' },
          { name: 'total_tool_spans', type: 'long' },
          { name: 'skill_invoked', type: 'long' },
        ],
        values: [[50, 1, 3, 1]],
      });

    const promise = evaluateWith(evaluator, VALID_TRACE_ID);
    await jest.advanceTimersByTimeAsync(60_000);
    const result = await promise;

    expect(result.score).toBe(1);
    expect(mockEsClient.esql.query).toHaveBeenCalledTimes(2);
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

  it('should return 0 when tool spans exist but skill was not among them', async () => {
    const evaluator = createSkillInvocationEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      skillName: 'data-exploration',
    });

    (mockEsClient.esql.query as jest.Mock).mockResolvedValue({
      columns: [
        { name: 'total_spans', type: 'long' },
        { name: 'agent_spans', type: 'long' },
        { name: 'total_tool_spans', type: 'long' },
        { name: 'skill_invoked', type: 'long' },
      ],
      values: [[50, 1, 15, 0]],
    });

    const result = await evaluateWith(evaluator, VALID_TRACE_ID);

    expect(result.score).toBe(0);
  });

  it('should return 0 without retrying when trace has spans but no tool calls were made', async () => {
    const evaluator = createSkillInvocationEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      skillName: 'data-exploration',
    });

    (mockEsClient.esql.query as jest.Mock).mockResolvedValue({
      columns: [
        { name: 'total_spans', type: 'long' },
        { name: 'agent_spans', type: 'long' },
        { name: 'total_tool_spans', type: 'long' },
        { name: 'skill_invoked', type: 'long' },
      ],
      values: [[30, 1, 0, 0]],
    });

    const result = await evaluateWith(evaluator, VALID_TRACE_ID);

    expect(result.score).toBe(0);
    expect(mockEsClient.esql.query).toHaveBeenCalledTimes(1);
  });

  it("should retry while the run's root span is not yet indexed", async () => {
    const evaluator = createSkillInvocationEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      skillName: 'data-exploration',
    });

    // Spans from the first batches are already visible (non-tool spans only), but the run's root
    // span has not been exported yet, so the skill span may still be missing: retry instead of
    // recording a permanent 0.
    (mockEsClient.esql.query as jest.Mock)
      .mockResolvedValueOnce({
        columns: [
          { name: 'total_spans', type: 'long' },
          { name: 'agent_spans', type: 'long' },
          { name: 'total_tool_spans', type: 'long' },
          { name: 'skill_invoked', type: 'long' },
        ],
        values: [[12, 0, 0, 0]],
      })
      .mockResolvedValueOnce({
        columns: [
          { name: 'total_spans', type: 'long' },
          { name: 'agent_spans', type: 'long' },
          { name: 'total_tool_spans', type: 'long' },
          { name: 'skill_invoked', type: 'long' },
        ],
        values: [[30, 1, 3, 1]],
      });

    const promise = evaluateWith(evaluator, VALID_TRACE_ID);
    await jest.advanceTimersByTimeAsync(60_000);
    const result = await promise;

    expect(result.score).toBe(1);
    expect(mockEsClient.esql.query).toHaveBeenCalledTimes(2);
  });

  it('should retry when expected columns are missing from the response', async () => {
    const evaluator = createSkillInvocationEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      skillName: 'data-exploration',
    });

    (mockEsClient.esql.query as jest.Mock)
      .mockResolvedValueOnce({
        columns: [{ name: 'unexpected_column', type: 'long' }],
        values: [[42]],
      })
      .mockResolvedValueOnce({
        columns: [
          { name: 'total_spans', type: 'long' },
          { name: 'agent_spans', type: 'long' },
          { name: 'total_tool_spans', type: 'long' },
          { name: 'skill_invoked', type: 'long' },
        ],
        values: [[50, 1, 3, 1]],
      });

    const promise = evaluateWith(evaluator, VALID_TRACE_ID);
    await jest.advanceTimersByTimeAsync(60_000);
    const result = await promise;

    expect(result.score).toBe(1);
    expect(mockEsClient.esql.query).toHaveBeenCalledTimes(2);
  });

  it('should return an error label when ES query throws persistently', async () => {
    const evaluator = createSkillInvocationEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      skillName: 'data-exploration',
    });

    (mockEsClient.esql.query as jest.Mock).mockRejectedValue(new Error('Network failure'));

    const promise = evaluateWith(evaluator, VALID_TRACE_ID);
    await jest.advanceTimersByTimeAsync(300_000);
    const result = await promise;

    expect(result.label).toBe('error');
    expect(result.score).toBeUndefined();
  });

  it('should throw for invalid skill names', () => {
    expect(() =>
      createSkillInvocationEvaluator({
        traceEsClient: mockEsClient,
        log: mockLog,
        skillName: 'bad"; DROP TABLE',
      })
    ).toThrow(/Invalid skillName/);
  });
});
