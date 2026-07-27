/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import type { EbtTelemetryClient } from '../../lib/telemetry/ebt';
import type { SignificantEventsMaintenanceService } from '../../lib/maintenance/maintenance_service';
import type { SignificantEventsKIsOnboardingClient } from '../../lib/workflows/onboarding_workflow_client';
import type { MemoryToolsOptions } from '../../memory_and_investigation/tools/memory';
import { knowledgeIndicatorsManagementSkill } from './knowledge_indicators_management';
import { createKiIdentificationManagementSkill } from './ki_identification_management';
import { significantEventsManagementSkill } from './significant_events_management';
import { significantEventsKIGroundingSkill } from './significant_events_ki_grounding';
import {
  createSignificantEventsOnboardingSkill,
  createGapDetectionSkill,
} from '../../memory_and_investigation/skills/memory';
import { streamsInvestigationManagementSkill } from '../../memory_and_investigation/skills/investigation_management';

type SignificantEventsSkill = Parameters<AgentBuilderPluginStart['skills']['register']>[0];

interface RegisterSignificantEventsSkillsOptions {
  agentBuilder: AgentBuilderPluginStart;
  telemetry: EbtTelemetryClient;
  streamsKIsOnboardingClient?: SignificantEventsKIsOnboardingClient;
  maintenanceService?: SignificantEventsMaintenanceService;
  memoryToolsOptions: MemoryToolsOptions;
  logger: Logger;
  isAvailable: () => Promise<boolean>;
}

/**
 * Registers the significant events agent-builder skills at start, gated by the
 * `streams.significantEventsAvailable` feature flag. Skills register through the start-phase
 * `skills.register` API only when the feature is available, and again when the flag flips on. The
 * investigation skill is part of the unified experience, so it registers with the rest.
 *
 * `skills.register` throws if a skill id is already registered, so we track the ids we have
 * registered and never re-attempt them, and we serialize `ensureRegistered` calls. Together these
 * make retries after a partial failure and repeated flips safe: no duplicate registration and no
 * stuck "already registered" errors.
 *
 * The flip only ever adds skills. A skill registered while the feature was on cannot be removed if
 * the flag later flips off, so request-time gating (see `assertSignificantEventsAccess`) stays the
 * mechanism that blocks access once the feature is unavailable. Agent-builder tools, attachments,
 * and agents likewise stay registered at setup (those APIs are setup-only).
 */
export const registerSignificantEventsSkills = async ({
  agentBuilder,
  telemetry,
  streamsKIsOnboardingClient,
  maintenanceService,
  memoryToolsOptions,
  logger,
  isAvailable,
}: RegisterSignificantEventsSkillsOptions): Promise<{ ensureRegistered: () => Promise<void> }> => {
  const registeredSkillIds = new Set<string>();

  const getCoreSkills = (): SignificantEventsSkill[] => [
    knowledgeIndicatorsManagementSkill,
    significantEventsKIGroundingSkill,
    significantEventsManagementSkill,
    ...(streamsKIsOnboardingClient && maintenanceService
      ? [
          createKiIdentificationManagementSkill({
            telemetry,
            streamsKIsOnboardingClient,
            maintenanceService,
          }),
        ]
      : []),
    createSignificantEventsOnboardingSkill(memoryToolsOptions),
    createGapDetectionSkill(memoryToolsOptions),
    streamsInvestigationManagementSkill,
  ];

  // Registers only the skills not registered yet. Already-registered skills are skipped (a second
  // register() call throws), so this is safe to call repeatedly and after a partial failure.
  const registerSkills = async (
    skills: SignificantEventsSkill[],
    context: string,
    successMessage: string
  ): Promise<void> => {
    const pending = skills.filter((skill) => !registeredSkillIds.has(skill.id));
    if (pending.length === 0) {
      return;
    }

    const results = await Promise.allSettled(
      pending.map((skill) => agentBuilder.skills.register(skill))
    );

    const failed: string[] = [];
    results.forEach((result, index) => {
      const { id } = pending[index];
      if (result.status === 'fulfilled') {
        registeredSkillIds.add(id);
      } else {
        failed.push(id);
        logger.error(
          `Failed to register significant events ${context} skill "${id}": ${
            result.reason instanceof Error ? result.reason.message : String(result.reason)
          }`
        );
      }
    });

    if (failed.length === 0) {
      logger.info(successMessage);
    } else {
      logger.warn(
        `Significant events ${context} skills partially registered (${
          pending.length - failed.length
        }/${pending.length}). Failed: [${failed.join(', ')}]. Will retry on the next flag change.`
      );
    }
  };

  const doEnsureRegistered = async (): Promise<void> => {
    if (!(await isAvailable())) {
      logger.debug('significant_events: availability flag disabled, skipping skills registration');
      return;
    }

    await registerSkills(
      getCoreSkills(),
      'core',
      'Significant events skills registered (streams.significantEventsAvailable is enabled)'
    );
  };

  // Serialize invocations: the availability flip can fire while a prior run is in flight, and
  // registering the same skill twice throws. Chaining runs them one at a time; each run only
  // attempts skills that are not yet registered.
  let queue: Promise<void> = Promise.resolve();
  const ensureRegistered = (): Promise<void> => {
    queue = queue.catch(() => {}).then(doEnsureRegistered);
    return queue;
  };

  await ensureRegistered();

  return { ensureRegistered };
};
