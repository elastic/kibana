/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/server';
import { createSigEventsSkill, SIG_EVENTS_SKILL_ID } from './skills/sig_events_skill';

export interface EnableSigEventsSkillResult {
  skillRegistered: boolean;
  message: string;
}

export interface DisableSigEventsSkillResult {
  skillUnregistered: boolean;
  message: string;
}

/**
 * Registers the SigEvents skill in the global Agent Builder registry.
 * Agents with enable_elastic_capabilities (or explicit skill_ids including sig-events) can use it.
 */
export async function enableSigEventsSkill(
  agentBuilder: AgentBuilderPluginStart
): Promise<EnableSigEventsSkillResult> {
  const skill = createSigEventsSkill();
  try {
    await agentBuilder.skills.register(skill);
    return {
      skillRegistered: true,
      message:
        'SigEvents skill and tools are registered globally. Default agents with enable_elastic_capabilities can use this skill in any space.',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('already registered')) {
      return {
        skillRegistered: true,
        message: 'SigEvents skill was already registered.',
      };
    }
    throw err;
  }
}

/**
 * Unregisters the SigEvents skill globally. Call only after persisting disabled in Default space settings.
 */
export async function disableSigEventsSkill(
  agentBuilder: AgentBuilderPluginStart,
  logger: Logger
): Promise<DisableSigEventsSkillResult> {
  try {
    await agentBuilder.skills.unregister(SIG_EVENTS_SKILL_ID);
    return {
      skillUnregistered: true,
      message: 'SigEvents skill unregistered.',
    };
  } catch (err) {
    logger.warn('Failed to unregister SigEvents skill', {
      error: err instanceof Error ? err : new Error(String(err)),
    });
    return {
      skillUnregistered: false,
      message: `Could not unregister SigEvents skill: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
}
