/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/core/server';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import {
  getExplicitSkillIds,
  hasSkillSelectionWildcard,
  type SkillSelection,
} from '@kbn/agent-builder-common/skills';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/server';
import { createSigEventsSkill, SIG_EVENTS_SKILL_ID } from './skills/sig_events_skill';

export interface EnableSigEventsSkillResult {
  skillRegistered: boolean;
  defaultAgentUpdated: boolean;
  message: string;
}

export interface DisableSigEventsSkillResult {
  defaultAgentUpdated: boolean;
  skillUnregistered: boolean;
  message: string;
}

export interface EnableSigEventsSkillOptions {
  /** Tool IDs the skill should expose. If omitted, all Sig Events tools are used. */
  toolIds?: string[];
  /** Override the default skill content (markdown) shown to the model. */
  content?: string;
}

/**
 * Registers the SigEvents skill and adds it to the default agent's skill selection.
 * Pass toolIds to restrict which tools the skill exposes; omit for all tools.
 * Pass content to override the default skill content.
 */
export async function enableSigEventsSkill(
  agentBuilder: AgentBuilderPluginStart,
  request: KibanaRequest,
  options?: EnableSigEventsSkillOptions
): Promise<EnableSigEventsSkillResult> {
  let skillRegistered = false;
  let defaultAgentUpdated = false;

  const skill = createSigEventsSkill(options?.toolIds, options?.content);

  try {
    await agentBuilder.skills.register(skill);
    skillRegistered = true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes('already registered')) {
      throw err;
    }
  }

  try {
    const registry = await agentBuilder.agents.getRegistry({ request });
    const agent = await registry.get(agentBuilderDefaultAgentId);
    const currentSkills: SkillSelection[] = agent.configuration?.skills ?? [];
    const explicitIds = getExplicitSkillIds(currentSkills);
    if (explicitIds.includes(SIG_EVENTS_SKILL_ID)) {
      return {
        skillRegistered,
        defaultAgentUpdated: false,
        message: 'SigEvents skill was already on the default agent.',
      };
    }
    const newExplicitIds = [...explicitIds, SIG_EVENTS_SKILL_ID];
    const newSkills: SkillSelection[] = hasSkillSelectionWildcard(currentSkills)
      ? [{ skill_ids: ['*', ...newExplicitIds] }]
      : [{ skill_ids: newExplicitIds }];

    await registry.update(agentBuilderDefaultAgentId, {
      configuration: { skills: newSkills },
    });
    defaultAgentUpdated = true;
  } catch (err) {
    if (skillRegistered) {
      return {
        skillRegistered: true,
        defaultAgentUpdated: false,
        message: `Skill registered but default agent could not be updated: ${
          err instanceof Error ? err.message : String(err)
        }. You may add the skill to the default agent in Agent Builder.`,
      };
    }
    throw err;
  }

  return {
    skillRegistered,
    defaultAgentUpdated,
    message: defaultAgentUpdated
      ? 'SigEvents skill enabled and added to the default agent.'
      : 'SigEvents skill registered.',
  };
}

/**
 * Removes the SigEvents skill from the default agent and unregisters the skill.
 */
export async function disableSigEventsSkill(
  agentBuilder: AgentBuilderPluginStart,
  request: KibanaRequest,
  logger: Logger
): Promise<DisableSigEventsSkillResult> {
  let defaultAgentUpdated = false;

  const registry = await agentBuilder.agents.getRegistry({ request });
  const agent = await registry.get(agentBuilderDefaultAgentId);
  const currentSkills: SkillSelection[] = agent.configuration?.skills ?? [];
  const wasPresent = currentSkills.some((s) => s.skill_ids.includes(SIG_EVENTS_SKILL_ID));
  if (!wasPresent) {
    await agentBuilder.skills.unregister(SIG_EVENTS_SKILL_ID).catch((err) => {
      logger.warn('Failed to unregister SigEvents skill', { error: err });
    });
    return {
      defaultAgentUpdated: false,
      skillUnregistered: true,
      message: 'SigEvents skill was not on the default agent; skill unregistered.',
    };
  }

  const explicitIds = getExplicitSkillIds(currentSkills).filter((id) => id !== SIG_EVENTS_SKILL_ID);
  const hasWildcard = hasSkillSelectionWildcard(currentSkills);
  const newSkills: SkillSelection[] = hasWildcard
    ? [{ skill_ids: ['*', ...explicitIds] }]
    : explicitIds.length > 0
    ? [{ skill_ids: explicitIds }]
    : [];

  await registry.update(agentBuilderDefaultAgentId, {
    configuration: { skills: newSkills },
  });
  defaultAgentUpdated = true;

  await agentBuilder.skills.unregister(SIG_EVENTS_SKILL_ID).catch((err) => {
    logger.warn('Failed to unregister SigEvents skill', { error: err });
  });

  return {
    defaultAgentUpdated,
    skillUnregistered: true,
    message: defaultAgentUpdated
      ? 'SigEvents skill removed from the default agent and unregistered.'
      : 'Default agent was not updated; skill unregistered.',
  };
}
