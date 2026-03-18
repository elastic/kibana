/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/core/server';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
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
 * Registers the SigEvents skill. If the default agent already has an explicit
 * `skill_ids` list, appends SigEvents to it. If `skill_ids` is empty or unset,
 * does not change the agent — `enable_elastic_capabilities` already enables
 * built-in skills; the registered skill is available without listing it.
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
    const currentSkillIds: string[] = agent.configuration?.skill_ids ?? [];
    if (currentSkillIds.includes(SIG_EVENTS_SKILL_ID)) {
      return {
        skillRegistered,
        defaultAgentUpdated: false,
        message: 'SigEvents skill was already on the default agent.',
      };
    }
    if (currentSkillIds.length === 0) {
      return {
        skillRegistered,
        defaultAgentUpdated: false,
        message:
          'SigEvents skill registered. Default agent has no explicit skill_ids list; built-in skills stay enabled.',
      };
    }
    const newSkillIds = [...currentSkillIds, SIG_EVENTS_SKILL_ID];

    await registry.update(agentBuilderDefaultAgentId, {
      configuration: { skill_ids: newSkillIds },
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
  const currentSkillIds: string[] = agent.configuration?.skill_ids ?? [];
  const wasPresent = currentSkillIds.includes(SIG_EVENTS_SKILL_ID);
  if (!wasPresent) {
    let skillUnregistered = false;
    try {
      await agentBuilder.skills.unregister(SIG_EVENTS_SKILL_ID);
      skillUnregistered = true;
    } catch (err) {
      logger.warn('Failed to unregister SigEvents skill', {
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
    return {
      defaultAgentUpdated: false,
      skillUnregistered,
      message: 'SigEvents skill was not on the default agent; skill unregistered.',
    };
  }

  const newSkillIds = currentSkillIds.filter((id: string) => id !== SIG_EVENTS_SKILL_ID);

  await registry.update(agentBuilderDefaultAgentId, {
    configuration: { skill_ids: newSkillIds },
  });
  defaultAgentUpdated = true;

  let skillUnregistered = false;
  try {
    await agentBuilder.skills.unregister(SIG_EVENTS_SKILL_ID);
    skillUnregistered = true;
  } catch (err) {
    logger.warn('Failed to unregister SigEvents skill', {
      error: err instanceof Error ? err : new Error(String(err)),
    });
  }

  return {
    defaultAgentUpdated,
    skillUnregistered,
    message: defaultAgentUpdated
      ? skillUnregistered
        ? 'SigEvents skill removed from the default agent and unregistered.'
        : 'SigEvents skill removed from the default agent; unregister failed (see logs).'
      : 'Default agent was not updated; skill unregistered.',
  };
}
