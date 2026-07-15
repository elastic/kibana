/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type { MemoryToolsOptions } from '../../tools/memory';
import { registerStreamsMemoryAgentBuilder } from './register';

const MEMORY_SKILL_IDS = [
  'significant-events-memory',
  'streams-memory-synthesis',
  'streams-memory-consolidation',
  'streams-conversation-scraper',
];

const memoryToolsOptions = {} as MemoryToolsOptions;

const createOptions = (
  overrides: Partial<Parameters<typeof registerStreamsMemoryAgentBuilder>[0]> = {}
) => {
  const agentBuilder = agentBuilderMocks.createStart();
  const options = {
    agentBuilder,
    memoryToolsOptions,
    logger: loggerMock.create(),
    isMemoryEnabled: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
  return { agentBuilder, options };
};

const getRegisteredIds = (agentBuilder: ReturnType<typeof agentBuilderMocks.createStart>) =>
  agentBuilder.skills.register.mock.calls.map((call) => call[0].id);

describe('registerStreamsMemoryAgentBuilder', () => {
  it('registers nothing when the memory flag is disabled', async () => {
    const { agentBuilder, options } = createOptions({
      isMemoryEnabled: jest.fn().mockResolvedValue(false),
    });

    await registerStreamsMemoryAgentBuilder(options);

    expect(agentBuilder.skills.register).not.toHaveBeenCalled();
  });

  it('registers all memory skills when the memory flag is enabled', async () => {
    const { agentBuilder, options } = createOptions();

    await registerStreamsMemoryAgentBuilder(options);

    const registeredIds = getRegisteredIds(agentBuilder);
    expect(registeredIds).toEqual(expect.arrayContaining(MEMORY_SKILL_IDS));
    expect(registeredIds).toHaveLength(MEMORY_SKILL_IDS.length);
  });

  it('is idempotent: a second onMemoryEnabled call does not re-register the skills', async () => {
    const { agentBuilder, options } = createOptions();

    const { onMemoryEnabled } = await registerStreamsMemoryAgentBuilder(options);
    const callsAfterFirst = agentBuilder.skills.register.mock.calls.length;

    await onMemoryEnabled();

    expect(agentBuilder.skills.register.mock.calls.length).toBe(callsAfterFirst);
  });

  it('installs on flip: registers nothing while disabled, then registers once it becomes enabled', async () => {
    const isMemoryEnabled = jest.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
    const { agentBuilder, options } = createOptions({ isMemoryEnabled });

    const { onMemoryEnabled } = await registerStreamsMemoryAgentBuilder(options);
    expect(agentBuilder.skills.register).not.toHaveBeenCalled();

    await onMemoryEnabled();

    expect(getRegisteredIds(agentBuilder)).toEqual(expect.arrayContaining(MEMORY_SKILL_IDS));
  });

  it('does not latch on partial failure and retries on the next call', async () => {
    const { agentBuilder, options } = createOptions();
    agentBuilder.skills.register.mockImplementation(async (skill) => {
      if (skill.id === 'streams-conversation-scraper') {
        throw new Error('boom');
      }
    });

    const { onMemoryEnabled } = await registerStreamsMemoryAgentBuilder(options);
    const callsAfterFirst = agentBuilder.skills.register.mock.calls.length;
    expect(options.logger.warn).toHaveBeenCalled();

    await onMemoryEnabled();

    expect(agentBuilder.skills.register.mock.calls.length).toBeGreaterThan(callsAfterFirst);
  });

  it('retries only the failed skill and never re-attempts already-registered ones', async () => {
    const { agentBuilder, options } = createOptions();
    agentBuilder.skills.register.mockImplementation(async (skill) => {
      if (skill.id === 'streams-conversation-scraper') {
        throw new Error('boom');
      }
    });

    const { onMemoryEnabled } = await registerStreamsMemoryAgentBuilder(options);
    expect(getRegisteredIds(agentBuilder)).toContain('streams-conversation-scraper');
    agentBuilder.skills.register.mockClear();

    await onMemoryEnabled();

    // Only the previously failed skill is retried; the ones that succeeded are not re-registered
    // (a second register() of the same id would throw "already registered").
    expect(getRegisteredIds(agentBuilder)).toEqual(['streams-conversation-scraper']);
  });

  it('registers all skills once a transient failure recovers on a later call', async () => {
    let failScraper = true;
    const { agentBuilder, options } = createOptions();
    agentBuilder.skills.register.mockImplementation(async (skill) => {
      if (skill.id === 'streams-conversation-scraper' && failScraper) {
        throw new Error('boom');
      }
    });

    const { onMemoryEnabled } = await registerStreamsMemoryAgentBuilder(options);
    failScraper = false;

    await onMemoryEnabled();

    expect(options.logger.info).toHaveBeenCalledWith(
      'Streams memory skills registered (streams.significantEventsMemoryEnabled is enabled)'
    );

    agentBuilder.skills.register.mockClear();
    await onMemoryEnabled();
    expect(agentBuilder.skills.register).not.toHaveBeenCalled();
  });

  it('serializes concurrent onMemoryEnabled calls and registers each skill exactly once', async () => {
    // Disabled on the initial call so registration happens on the concurrent flips below.
    const isMemoryEnabled = jest.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
    const { agentBuilder, options } = createOptions({ isMemoryEnabled });

    const { onMemoryEnabled } = await registerStreamsMemoryAgentBuilder(options);
    expect(agentBuilder.skills.register).not.toHaveBeenCalled();

    await Promise.all([onMemoryEnabled(), onMemoryEnabled(), onMemoryEnabled()]);

    const registeredIds = getRegisteredIds(agentBuilder);
    expect(registeredIds).toHaveLength(new Set(registeredIds).size);
    expect(new Set(registeredIds)).toEqual(new Set(MEMORY_SKILL_IDS));
  });
});
