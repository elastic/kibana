/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, UiSettingsServiceStart } from '@kbn/core/server';
import type { JsonObject } from '@kbn/utility-types';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { TimelineEventType, type RelevantSkill } from '@kbn/agent-builder-common';
import type { CycleHookDefinition, CycleHookExecutionContext } from '@kbn/agent-builder-server';
import { formatRelevantSkillsNotice } from '../prompts/utils/skills';
import {
  RELEVANT_SKILLS_TIMEOUT_MS,
  buildRecentContext,
  selectRelevantSkills,
} from '../utils/relevant_skills/select_relevant_skills';

export const RELEVANT_SKILLS_HOOK_ID = 'relevant-skills';

export interface RelevantSkillsCycleHookDeps {
  getUiSettings: () => Promise<UiSettingsServiceStart>;
}

/**
 * Contextual skill preselection: once per round, before the first model call, a fast model picks
 * the skills relevant to the request and the agent is told about them. Off unless the experimental
 * flag is on and a dedicated fast model is configured: without one the selection would run on the
 * default model, which defeats the point.
 */
export const createRelevantSkillsCycleHook = ({
  getUiSettings,
}: RelevantSkillsCycleHookDeps): CycleHookDefinition => ({
  id: RELEVANT_SKILLS_HOOK_ID,
  when: 'first',
  // The selection keeps its own time budget and returns nothing past it; the hook's only has to outlast it.
  timeout: RELEVANT_SKILLS_TIMEOUT_MS + 1_000,
  getHandler: async (execution) => {
    const { modelProvider, savedObjectsClient, logger } = execution.services;
    const [enabled, hasFastModel] = await Promise.all([
      isExperimentalEnabled(getUiSettings, savedObjectsClient),
      modelProvider.hasFastModel(),
    ]);
    if (!enabled || !hasFastModel) {
      return undefined;
    }

    return async (cycle, api) => {
      const { skills } = await selectRelevantSkills({
        skills: [...execution.agent.skills],
        context: {
          userMessage: execution.input.message,
          recentContext: buildRecentContext(recentExchanges(execution.conversation)),
        },
        modelProvider,
        logger,
        abortSignal: cycle.abortSignal,
      });
      if (skills.length > 0) {
        api.append({ text: formatRelevantSkillsNotice(skills), data: noticeData(skills) });
      }
    };
  },
});

const isExperimentalEnabled = async (
  getUiSettings: RelevantSkillsCycleHookDeps['getUiSettings'],
  savedObjectsClient: SavedObjectsClientContract
): Promise<boolean> => {
  try {
    const uiSettings = await getUiSettings();
    return await uiSettings
      .asScopedToClient(savedObjectsClient)
      .get<boolean>(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID);
  } catch {
    return false;
  }
};

/**
 * What the selector sees of the conversation: every earlier user message, with the answer of the
 * execution it started when there is one. A message that started no execution still counts.
 */
const recentExchanges = ({
  events,
  executions,
}: CycleHookExecutionContext['conversation']): Parameters<typeof buildRecentContext>[0] => {
  const answers = new Map<string, { message: string } | undefined>();
  for (const execution of executions) {
    for (const event of execution.events) {
      if (event.type === TimelineEventType.userMessage) {
        answers.set(event.id, execution.response);
      }
    }
  }
  return events.flatMap((event) =>
    event.type === TimelineEventType.userMessage
      ? [{ input: event.data, response: answers.get(event.id) }]
      : []
  );
};

const noticeData = (skills: RelevantSkill[]): JsonObject => ({
  source: 'implicit',
  skills: skills.map(({ id, name, path, description, relevance_note }) => ({
    id,
    name,
    path,
    description,
    relevance_note: relevance_note ?? null,
  })),
});
