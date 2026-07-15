/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type { MemoryToolsOptions } from '../../memory_and_investigation/tools/memory';
import type { EbtTelemetryClient } from '../../lib/telemetry/ebt';
import type { SignificantEventsKIsOnboardingClient } from '../../lib/workflows/onboarding_workflow_client';
import { registerSignificantEventsSkills } from './register_skills';
import { knowledgeIndicatorsManagementSkill } from './knowledge_indicators_management';
import { significantEventsManagementSkill } from './significant_events_management';
import { significantEventsKIGroundingSkill } from './significant_events_ki_grounding';
import { streamsInvestigationManagementSkill } from '../../memory_and_investigation/skills/investigation_management';

const KI_IDENTIFICATION_SKILL_ID = 'ki-identification-management';
const INVESTIGATION_SKILL_ID = streamsInvestigationManagementSkill.id;

// Core skills registered whenever the feature is available. The investigation skill is part of the
// unified experience, so it registers with the rest. `ki-identification-management` is only added
// when a KI onboarding client is present, so it is tracked separately below.
const CORE_SKILL_IDS = [
  knowledgeIndicatorsManagementSkill.id,
  significantEventsKIGroundingSkill.id,
  significantEventsManagementSkill.id,
  'significant-events-onboarding',
  'streams-gap-detection',
  INVESTIGATION_SKILL_ID,
];

const telemetry = {} as EbtTelemetryClient;
const memoryToolsOptions = {} as MemoryToolsOptions;
const streamsKIsOnboardingClient = {} as SignificantEventsKIsOnboardingClient;

const createOptions = (
  overrides: Partial<Parameters<typeof registerSignificantEventsSkills>[0]> = {}
) => {
  const agentBuilder = agentBuilderMocks.createStart();
  const options = {
    agentBuilder,
    telemetry,
    memoryToolsOptions,
    logger: loggerMock.create(),
    isAvailable: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
  return { agentBuilder, options };
};

const getRegisteredIds = (agentBuilder: ReturnType<typeof agentBuilderMocks.createStart>) =>
  agentBuilder.skills.register.mock.calls.map((call) => call[0].id);

describe('registerSignificantEventsSkills', () => {
  it('registers nothing when the availability flag is disabled', async () => {
    const { agentBuilder, options } = createOptions({
      isAvailable: jest.fn().mockResolvedValue(false),
    });

    await registerSignificantEventsSkills(options);

    expect(agentBuilder.skills.register).not.toHaveBeenCalled();
  });

  it('registers the core skills (without KI onboarding) when available', async () => {
    const { agentBuilder, options } = createOptions();

    await registerSignificantEventsSkills(options);

    const registeredIds = getRegisteredIds(agentBuilder);
    expect(registeredIds).toEqual(expect.arrayContaining(CORE_SKILL_IDS));
    expect(registeredIds).not.toContain(KI_IDENTIFICATION_SKILL_ID);
    expect(registeredIds).toHaveLength(CORE_SKILL_IDS.length);
  });

  it('includes the KI identification skill only when a KI onboarding client is provided', async () => {
    const { agentBuilder, options } = createOptions({ streamsKIsOnboardingClient });

    await registerSignificantEventsSkills(options);

    const registeredIds = getRegisteredIds(agentBuilder);
    expect(registeredIds).toContain(KI_IDENTIFICATION_SKILL_ID);
    expect(registeredIds).toHaveLength(CORE_SKILL_IDS.length + 1);
  });

  it('registers the investigation skill as part of the core skills when available', async () => {
    const { agentBuilder, options } = createOptions();

    await registerSignificantEventsSkills(options);

    expect(getRegisteredIds(agentBuilder)).toContain(INVESTIGATION_SKILL_ID);
  });

  it('is idempotent: a second ensureRegistered call does not re-register the core skills', async () => {
    const { agentBuilder, options } = createOptions();

    const { ensureRegistered } = await registerSignificantEventsSkills(options);
    const callsAfterFirst = agentBuilder.skills.register.mock.calls.length;

    await ensureRegistered();

    expect(agentBuilder.skills.register.mock.calls.length).toBe(callsAfterFirst);
  });

  it('installs on flip: registers nothing while unavailable, then registers once it becomes available', async () => {
    const isAvailable = jest.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
    const { agentBuilder, options } = createOptions({ isAvailable });

    const { ensureRegistered } = await registerSignificantEventsSkills(options);
    expect(agentBuilder.skills.register).not.toHaveBeenCalled();

    await ensureRegistered();

    expect(getRegisteredIds(agentBuilder)).toEqual(expect.arrayContaining(CORE_SKILL_IDS));
  });

  it('does not latch on partial failure and retries on the next call', async () => {
    const { agentBuilder, options } = createOptions();
    agentBuilder.skills.register.mockImplementation(async (skill) => {
      if (skill.id === 'streams-gap-detection') {
        throw new Error('boom');
      }
    });

    const { ensureRegistered } = await registerSignificantEventsSkills(options);
    const callsAfterFirst = agentBuilder.skills.register.mock.calls.length;
    expect(options.logger.warn).toHaveBeenCalled();

    await ensureRegistered();

    expect(agentBuilder.skills.register.mock.calls.length).toBeGreaterThan(callsAfterFirst);
  });

  it('retries only the failed skill and never re-attempts already-registered ones', async () => {
    const { agentBuilder, options } = createOptions();
    agentBuilder.skills.register.mockImplementation(async (skill) => {
      if (skill.id === 'streams-gap-detection') {
        throw new Error('boom');
      }
    });

    const { ensureRegistered } = await registerSignificantEventsSkills(options);
    expect(getRegisteredIds(agentBuilder)).toContain('streams-gap-detection');
    agentBuilder.skills.register.mockClear();

    await ensureRegistered();

    // Only the previously failed skill is retried; the ones that succeeded are not re-registered
    // (a second register() of the same id would throw "already registered").
    expect(getRegisteredIds(agentBuilder)).toEqual(['streams-gap-detection']);
  });

  it('registers all skills once a transient failure recovers on a later call', async () => {
    let failGapDetection = true;
    const { agentBuilder, options } = createOptions();
    agentBuilder.skills.register.mockImplementation(async (skill) => {
      if (skill.id === 'streams-gap-detection' && failGapDetection) {
        throw new Error('boom');
      }
    });

    const { ensureRegistered } = await registerSignificantEventsSkills(options);
    failGapDetection = false;

    await ensureRegistered();

    expect(options.logger.info).toHaveBeenCalledWith(
      'Significant events skills registered (streams.significantEventsAvailable is enabled)'
    );

    agentBuilder.skills.register.mockClear();
    await ensureRegistered();
    expect(agentBuilder.skills.register).not.toHaveBeenCalled();
  });

  it('serializes concurrent ensureRegistered calls and registers each skill exactly once', async () => {
    // Unavailable on the initial call so registration happens on the concurrent flips below.
    const isAvailable = jest.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
    const { agentBuilder, options } = createOptions({ isAvailable, streamsKIsOnboardingClient });

    const { ensureRegistered } = await registerSignificantEventsSkills(options);
    expect(agentBuilder.skills.register).not.toHaveBeenCalled();

    await Promise.all([ensureRegistered(), ensureRegistered(), ensureRegistered()]);

    const registeredIds = getRegisteredIds(agentBuilder);
    expect(registeredIds).toHaveLength(new Set(registeredIds).size);
    expect(new Set(registeredIds)).toEqual(
      new Set([...CORE_SKILL_IDS, KI_IDENTIFICATION_SKILL_ID])
    );
  });
});
