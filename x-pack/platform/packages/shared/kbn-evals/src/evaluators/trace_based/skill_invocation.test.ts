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

  it('should build a query filtering by skill name in the skill-loading tool parameters', async () => {
    const evaluator = createSkillInvocationEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      skillName: 'data-exploration',
    });

    (mockEsClient.esql.query as jest.Mock).mockResolvedValue({
      columns: [
        { name: 'total_spans', type: 'long' },
        { name: 'total_tool_spans', type: 'long' },
        { name: 'skill_invoked', type: 'long' },
      ],
      values: [[50, 1, 1]],
    });

    await evaluateWith(evaluator, VALID_TRACE_ID);

    const calledQuery = (mockEsClient.esql.query as jest.Mock).mock.calls[0][0].query;
    expect(calledQuery).toContain(`trace.id == "${VALID_TRACE_ID}"`);
    expect(calledQuery).toContain('total_spans = COUNT(*)');
    expect(calledQuery).toContain('attributes.elastic.inference.span.kind == "TOOL"');
    expect(calledQuery).toContain(
      'attributes.gen_ai.tool.name IN ("load_skill", "filestore.read")'
    );
    expect(calledQuery).toContain('*/data-exploration/SKILL.md*');
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
        { name: 'total_tool_spans', type: 'long' },
        { name: 'skill_invoked', type: 'long' },
      ],
      values: [[50, 2, 1]],
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
        { name: 'total_tool_spans', type: 'long' },
        { name: 'skill_invoked', type: 'long' },
      ],
      values: [[50, 2, 0]],
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
        { name: 'total_tool_spans', type: 'long' },
        { name: 'skill_invoked', type: 'long' },
      ],
      values: [[50, 4, 3]],
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
          { name: 'total_tool_spans', type: 'long' },
          { name: 'skill_invoked', type: 'long' },
        ],
        values: [[0, 0, 0]],
      })
      .mockResolvedValueOnce({
        columns: [
          { name: 'total_spans', type: 'long' },
          { name: 'total_tool_spans', type: 'long' },
          { name: 'skill_invoked', type: 'long' },
        ],
        values: [[50, 3, 1]],
      });

    const promise = evaluateWith(evaluator, VALID_TRACE_ID);
    await jest.advanceTimersByTimeAsync(60_000);
    const result = await promise;

    expect(result.score).toBe(1);
    expect(mockEsClient.esql.query).toHaveBeenCalledTimes(2);
  });

  it('detects a skill loaded through load_skill, not just filestore.read', async () => {
    // Agent Builder activates a skill by calling `load_skill` with a
    // `{"skill":"<name>"}` argument. Matching only `filestore.read` against a
    // `/<name>/SKILL.md` path makes this evaluator score 0 for every model on
    // every run, which is what golden shows: 415 observations, never a 1.
    const evaluator = createSkillInvocationEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      skillName: 'data-exploration',
    });

    (mockEsClient.esql.query as jest.Mock).mockResolvedValueOnce({
      columns: [
        { name: 'total_spans', type: 'long' },
        { name: 'total_tool_spans', type: 'long' },
        { name: 'skill_invoked', type: 'long' },
      ],
      values: [[50, 3, 1]],
    });

    const promise = evaluateWith(evaluator, VALID_TRACE_ID);
    await jest.advanceTimersByTimeAsync(60_000);
    await promise;

    const sentQuery = (mockEsClient.esql.query as jest.Mock).mock.calls[0][0].query as string;

    expect(sentQuery).toContain('load_skill');
    expect(sentQuery).toContain('"skill\\":\\"data-exploration');
    expect(sentQuery).toContain('/data-exploration/SKILL.md');
  });

  describe('skill_invoked clause against real tool-call shapes', () => {
    // The ES|QL runs server-side, so mirror its semantics for the one clause that matters:
    // `tool.name IN (...) AND (args LIKE "<pattern>" OR ...)`. Tool names and LIKE patterns are
    // parsed out of the query the evaluator actually sends, so a regression in the query itself
    // shows up here rather than only in a substring check.
    const unescapeEsql = (literal: string) => literal.replace(/\\(.)/g, '$1');
    const likeToRegExp = (pattern: string) =>
      new RegExp(
        `^${pattern
          .split('*')
          .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
          .join('.*')}$`,
        's'
      );

    const countsAsInvocation = async (
      skillName: string,
      call: { tool: string; args: Record<string, unknown> }
    ) => {
      const evaluator = createSkillInvocationEvaluator({
        traceEsClient: mockEsClient,
        log: mockLog,
        skillName,
      });
      (mockEsClient.esql.query as jest.Mock).mockResolvedValueOnce({
        columns: [
          { name: 'total_spans', type: 'long' },
          { name: 'total_tool_spans', type: 'long' },
          { name: 'skill_invoked', type: 'long' },
        ],
        values: [[10, 1, 0]],
      });
      const promise = evaluateWith(evaluator, VALID_TRACE_ID);
      await jest.advanceTimersByTimeAsync(60_000);
      await promise;

      const query = (mockEsClient.esql.query as jest.Mock).mock.calls[0][0].query as string;
      const clause = query.slice(query.indexOf('skill_invoked = COUNT('));

      const toolNames = [
        ...(clause.match(/attributes\.gen_ai\.tool\.name IN \(([^)]*)\)/)?.[1] ?? '').matchAll(
          /"([^"]*)"/g
        ),
      ].map((match) => match[1]);
      const equalsTool = clause.match(/attributes\.gen_ai\.tool\.name == "([^"]*)"/)?.[1];
      if (equalsTool) toolNames.push(equalsTool);

      const patterns = [
        ...clause.matchAll(/attributes\.gen_ai\.tool\.call\.arguments LIKE "((?:[^"\\]|\\.)*)"/g),
      ].map((match) => unescapeEsql(match[1]));

      const serializedArgs = JSON.stringify(call.args);
      return (
        toolNames.includes(call.tool) &&
        patterns.some((pattern) => likeToRegExp(pattern).test(serializedArgs))
      );
    };

    it.each([
      ['skill name', { skill: 'alert-analysis' }],
      ['SKILL.md path', { skill: '/skills/security/alerts/alert-analysis/SKILL.md' }],
    ])('counts load_skill by %s', async (_label, args) => {
      expect(await countsAsInvocation('alert-analysis', { tool: 'load_skill', args })).toBe(true);
    });

    it('still counts the legacy filestore.read of the SKILL.md path', async () => {
      expect(
        await countsAsInvocation('alert-analysis', {
          tool: 'filestore.read',
          args: { path: '/skills/security/alerts/alert-analysis/SKILL.md' },
        })
      ).toBe(true);
    });

    it('does not count load_skill of a different skill', async () => {
      expect(
        await countsAsInvocation('alert-analysis', {
          tool: 'load_skill',
          args: { skill: 'entity-analytics' },
        })
      ).toBe(false);
    });

    it('does not count a skill whose name merely starts with the target name', async () => {
      expect(
        await countsAsInvocation('alert-analysis', {
          tool: 'load_skill',
          args: { skill: 'alert-analysis-extra' },
        })
      ).toBe(false);
    });

    it('does not count an unrelated tool that mentions the skill', async () => {
      expect(
        await countsAsInvocation('alert-analysis', {
          tool: 'platform.core.search',
          args: { skill: 'alert-analysis' },
        })
      ).toBe(false);
    });
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
        { name: 'total_tool_spans', type: 'long' },
        { name: 'skill_invoked', type: 'long' },
      ],
      values: [[50, 15, 0]],
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
        { name: 'total_tool_spans', type: 'long' },
        { name: 'skill_invoked', type: 'long' },
      ],
      values: [[30, 0, 0]],
    });

    const result = await evaluateWith(evaluator, VALID_TRACE_ID);

    expect(result.score).toBe(0);
    expect(mockEsClient.esql.query).toHaveBeenCalledTimes(1);
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
          { name: 'total_tool_spans', type: 'long' },
          { name: 'skill_invoked', type: 'long' },
        ],
        values: [[50, 3, 1]],
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
