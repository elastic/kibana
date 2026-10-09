/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import type { ModelProvider } from '@kbn/agent-builder-server/runner';
import {
  selectRelevantSkills,
  buildRecentContext,
  MAX_SELECTED_SKILLS,
} from './select_relevant_skills';

const skill = (overrides: Partial<InternalSkillDefinition>): InternalSkillDefinition =>
  ({
    id: 'platform.core.test-skill',
    name: 'test-skill',
    description: 'A test skill',
    basePath: 'skills/platform/core',
    referencedContent: [],
    ...overrides,
  } as unknown as InternalSkillDefinition);

// Above SMALL_SKILL_THRESHOLD (3) so a model call is triggered.
const manySkills = () => [
  skill({ id: 'a.alpha', name: 'alpha', description: 'Alpha' }),
  skill({ id: 'a.beta', name: 'beta', description: 'Beta' }),
  skill({ id: 'a.gamma', name: 'gamma', description: 'Gamma' }),
  skill({ id: 'a.delta', name: 'delta', description: 'Delta' }),
];

const makeModelProvider = (invoke: jest.Mock) => {
  const withStructuredOutput = jest.fn().mockReturnValue({ invoke });
  const chatModel = { withStructuredOutput } as unknown;
  const selectModel = jest.fn().mockResolvedValue({ chatModel });
  return {
    modelProvider: { selectModel } as unknown as ModelProvider,
    selectModel,
    withStructuredOutput,
  };
};

describe('selectRelevantSkills', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => jest.clearAllMocks());

  it('short-circuits with no model call when there are no skills', async () => {
    const invoke = jest.fn();
    const { modelProvider, selectModel } = makeModelProvider(invoke);

    const result = await selectRelevantSkills({
      skills: [],
      context: { userMessage: 'hi' },
      modelProvider,
      logger,
    });

    expect(result).toEqual({ skills: [] });
    expect(selectModel).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
  });

  it('returns all skills without a model call when at/below the small threshold', async () => {
    const invoke = jest.fn();
    const { modelProvider, selectModel } = makeModelProvider(invoke);
    const skills = [skill({ id: 'a.one', name: 'one' }), skill({ id: 'a.two', name: 'two' })];

    const result = await selectRelevantSkills({
      skills,
      context: { userMessage: 'hi' },
      modelProvider,
      logger,
    });

    expect(result.skills.map((s) => s.id)).toEqual(['a.one', 'a.two']);
    expect(result.skills[0]).toMatchObject({
      id: 'a.one',
      name: 'one',
      description: 'A test skill',
    });
    expect(result.skills[0].path).toContain('SKILL.md');
    expect(selectModel).not.toHaveBeenCalled();
  });

  it('maps returned ids to full skills and attaches the relevance note', async () => {
    const invoke = jest.fn().mockResolvedValue({
      skills: [{ id: 'a.gamma', relevance_note: 'because gamma' }, { id: 'a.alpha' }],
    });
    const { modelProvider, selectModel } = makeModelProvider(invoke);

    const result = await selectRelevantSkills({
      skills: manySkills(),
      context: { userMessage: 'do a thing' },
      modelProvider,
      logger,
    });

    expect(selectModel).toHaveBeenCalledWith({ effortLevel: 'low' });
    expect(result.skills.map((s) => s.id)).toEqual(['a.gamma', 'a.alpha']);
    expect(result.skills[0]).toMatchObject({ name: 'gamma', relevance_note: 'because gamma' });
    expect(result.skills[1].relevance_note).toBeUndefined();
  });

  it('caps the number of selected skills to MAX_SELECTED_SKILLS', async () => {
    const skills = Array.from({ length: MAX_SELECTED_SKILLS + 5 }, (_, index) =>
      skill({ id: `catalog.skill-${index}`, name: `skill-${index}`, description: `d-${index}` })
    );
    const invoke = jest.fn().mockResolvedValue({
      skills: skills.map((s) => ({ id: s.id })),
    });
    const { modelProvider } = makeModelProvider(invoke);

    const result = await selectRelevantSkills({
      skills,
      context: { userMessage: 'x' },
      modelProvider,
      logger,
    });

    expect(result.skills).toHaveLength(MAX_SELECTED_SKILLS);
    expect(result.skills.map((s) => s.id)).toEqual(
      skills.slice(0, MAX_SELECTED_SKILLS).map((s) => s.id)
    );
  });

  it('deduplicates repeated ids returned by the model', async () => {
    const invoke = jest.fn().mockResolvedValue({
      skills: [{ id: 'a.alpha' }, { id: 'a.alpha' }, { id: 'a.beta' }],
    });
    const { modelProvider } = makeModelProvider(invoke);

    const result = await selectRelevantSkills({
      skills: manySkills(),
      context: { userMessage: 'x' },
      modelProvider,
      logger,
    });

    expect(result.skills.map((s) => s.id)).toEqual(['a.alpha', 'a.beta']);
  });

  it('drops hallucinated ids not present in the input set', async () => {
    const invoke = jest.fn().mockResolvedValue({
      skills: [{ id: 'a.alpha' }, { id: 'does.not.exist' }],
    });
    const { modelProvider } = makeModelProvider(invoke);

    const result = await selectRelevantSkills({
      skills: manySkills(),
      context: { userMessage: 'x' },
      modelProvider,
      logger,
    });

    expect(result.skills.map((s) => s.id)).toEqual(['a.alpha']);
  });

  it('falls back to an empty selection when the model call throws', async () => {
    const invoke = jest.fn().mockRejectedValue(new Error('boom'));
    const { modelProvider } = makeModelProvider(invoke);

    const result = await selectRelevantSkills({
      skills: manySkills(),
      context: { userMessage: 'x' },
      modelProvider,
      logger,
    });

    expect(result).toEqual({ skills: [] });
  });

  it('falls back to an empty selection (never hangs) when the call exceeds the timeout', async () => {
    const invoke = jest.fn().mockReturnValue(new Promise(() => {})); // never resolves
    const { modelProvider } = makeModelProvider(invoke);
    const testLogger = loggingSystemMock.createLogger();

    const result = await selectRelevantSkills({
      skills: manySkills(),
      context: { userMessage: 'x' },
      modelProvider,
      logger: testLogger,
      timeoutMs: 20,
    });

    expect(result).toEqual({ skills: [] });
    // A debug line for the timeout aids observability of fast-model latency in production
    // (connectors that ignore the abort signal keep the request running silently).
    expect(testLogger.debug).toHaveBeenCalledWith(expect.stringContaining('timed out after 20ms'));
    // The catch-branch warn message carries the timeout-specific reason too.
    expect(testLogger.warn).toHaveBeenCalledWith(expect.stringContaining('timed out after 20ms'));
  });

  it('falls back to an empty selection when the external abort signal fires', async () => {
    const invoke = jest.fn().mockReturnValue(new Promise(() => {})); // never resolves on its own
    const { modelProvider } = makeModelProvider(invoke);
    const testLogger = loggingSystemMock.createLogger();
    const controller = new AbortController();

    const promise = selectRelevantSkills({
      skills: manySkills(),
      context: { userMessage: 'x' },
      modelProvider,
      logger: testLogger,
      abortSignal: controller.signal,
      timeoutMs: 10_000, // long, so the abort — not the timeout — settles the race
    });
    controller.abort();

    await expect(promise).resolves.toEqual({ skills: [] });
    // Abort (not timeout): the warn carries the abort reason, and no timeout debug line is emitted.
    expect(testLogger.warn).toHaveBeenCalledWith(expect.stringContaining('aborted'));
    expect(testLogger.debug).not.toHaveBeenCalledWith(expect.stringContaining('timed out'));
  });
});

describe('buildRecentContext', () => {
  it('formats the last N rounds as User/Assistant lines', () => {
    const rounds = [
      { input: { message: 'q1' }, response: { message: 'a1' } },
      { input: { message: 'q2' }, response: { message: 'a2' } },
    ];
    const result = buildRecentContext(rounds, { maxRounds: 2 });
    expect(result).toContain('User: q1');
    expect(result).toContain('Assistant: a1');
    expect(result).toContain('User: q2');
  });

  it('keeps only the most recent rounds', () => {
    const rounds = [
      { input: { message: 'old' }, response: { message: 'x' } },
      { input: { message: 'newer' }, response: { message: 'y' } },
    ];
    const result = buildRecentContext(rounds, { maxRounds: 1 });
    expect(result).not.toContain('old');
    expect(result).toContain('newer');
  });

  it('caps each message individually with an ellipsis marker', () => {
    const rounds = [
      { input: { message: 'a'.repeat(100) }, response: { message: 'b'.repeat(100) } },
    ];
    const result = buildRecentContext(rounds, { maxChars: 200 });
    // Each message is truncated with an ellipsis marker, so both are represented — a single
    // tail slice would have dropped the user message entirely once the budget was exceeded.
    expect(result).toMatch(/User: a+…/);
    expect(result).toMatch(/Assistant: b+…/);
    // Full 100-char message never leaks through (the per-message cap is well under 100).
    expect(result).not.toContain('a'.repeat(100));
    expect(result).not.toContain('b'.repeat(100));
  });

  it('preserves the older user question even when the newer assistant response is verbose', () => {
    const rounds = [
      { input: { message: 'older user question about X' }, response: { message: 'ok' } },
      { input: { message: 'newer q' }, response: { message: 'z'.repeat(5_000) } },
    ];
    const result = buildRecentContext(rounds, { maxChars: 200, maxRounds: 3 });
    // With a single tail slice on the joined blob this line would be cut. Per-message
    // truncation keeps it intact.
    expect(result).toContain('older user question about X');
  });

  it('applies the overall char budget as a backstop', () => {
    const rounds = [
      { input: { message: 'a'.repeat(1_000) }, response: { message: 'b'.repeat(1_000) } },
      { input: { message: 'c'.repeat(1_000) }, response: { message: 'd'.repeat(1_000) } },
    ];
    const result = buildRecentContext(rounds, { maxChars: 200 });
    expect(result.length).toBeLessThanOrEqual(200);
  });

  it('tolerates rounds without a response', () => {
    const rounds = [{ input: { message: 'q' } }];
    expect(() => buildRecentContext(rounds)).not.toThrow();
  });
});
