/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { TimelineEventType, type RelevantSkill } from '@kbn/agent-builder-common';
import type {
  CycleContext,
  CycleHookApi,
  CycleHookExecutionContext,
  ExecutionSummary,
  ProcessedTimelineEvent,
} from '@kbn/agent-builder-server';
import { isAllowedCycleHook } from '@kbn/agent-builder-server/allow_lists';
import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import { formatRelevantSkillsNotice } from '../prompts/utils/skills';
import {
  RELEVANT_SKILLS_TIMEOUT_MS,
  buildRecentContext,
  selectRelevantSkills,
} from '../utils/relevant_skills/select_relevant_skills';
import { RELEVANT_SKILLS_HOOK_ID, createRelevantSkillsCycleHook } from './relevant_skills_hook';

jest.mock('../utils/relevant_skills/select_relevant_skills', () => ({
  ...jest.requireActual('../utils/relevant_skills/select_relevant_skills'),
  selectRelevantSkills: jest.fn(),
}));

const selectRelevantSkillsMock = selectRelevantSkills as jest.MockedFunction<
  typeof selectRelevantSkills
>;

const skill = (id: string): InternalSkillDefinition =>
  ({ id, name: id, description: `${id} description` } as unknown as InternalSkillDefinition);

const relevant = (id: string, relevanceNote?: string): RelevantSkill => ({
  id,
  name: id,
  path: `/skills/${id}`,
  description: `${id} description`,
  ...(relevanceNote ? { relevance_note: relevanceNote } : {}),
});

const userMessage = (id: string, message: string): ProcessedTimelineEvent =>
  ({
    id,
    type: TimelineEventType.userMessage,
    created_at: '2026-01-01T00:00:00.000Z',
    actor: { type: 'user', id: 'u1' },
    data: { message, attachments: [] },
  } as unknown as ProcessedTimelineEvent);

const answered = (trigger: ProcessedTimelineEvent, message: string): ExecutionSummary =>
  ({
    id: `${trigger.id}::execution`,
    input: trigger.data,
    steps: [],
    outcome: 'responded',
    response: { message },
    events: [trigger],
  } as unknown as ExecutionSummary);

const setup = ({
  flag = true,
  fastModel = true,
  flagError = false,
}: { flag?: boolean; fastModel?: boolean; flagError?: boolean } = {}) => {
  const get = jest.fn(async (key: string) => {
    if (flagError) {
      throw new Error('settings unavailable');
    }
    return key === AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID ? flag : undefined;
  });
  const uiSettings = { asScopedToClient: jest.fn(() => ({ get })) };
  const savedObjectsClient = { tag: 'scoped-so-client' };
  const logger = loggingSystemMock.createLogger();
  const modelProvider = { hasFastModel: jest.fn().mockResolvedValue(fastModel) };

  const first = userMessage('m1', 'first question');
  const lonely = userMessage('m2', 'posted with no run');
  const execution = {
    agent: { id: 'agent-1', skills: [skill('alpha'), skill('beta')] },
    input: { message: 'current request', attachments: [] },
    conversation: {
      events: [first, lonely],
      executions: [answered(first, 'first answer')],
    },
    services: { modelProvider, savedObjectsClient, logger },
  } as unknown as CycleHookExecutionContext;

  const definition = createRelevantSkillsCycleHook({
    getUiSettings: async () => uiSettings as never,
  });
  return { definition, execution, uiSettings, savedObjectsClient, modelProvider, logger };
};

describe('createRelevantSkillsCycleHook', () => {
  beforeEach(() => {
    selectRelevantSkillsMock.mockReset();
  });

  it('is a first hook, on the allow list, with a time budget above the selection’s own', () => {
    const { definition } = setup();

    expect(definition.id).toBe(RELEVANT_SKILLS_HOOK_ID);
    expect(isAllowedCycleHook(definition.id)).toBe(true);
    expect(definition.when).toBe('first');
    expect(definition.timeout).toBeGreaterThan(RELEVANT_SKILLS_TIMEOUT_MS);
  });

  it('reads the experimental flag through the execution’s saved-objects client', async () => {
    const { definition, execution, uiSettings, savedObjectsClient } = setup();

    await definition.getHandler(execution);

    expect(uiSettings.asScopedToClient).toHaveBeenCalledWith(savedObjectsClient);
  });

  it.each([
    ['the experimental flag is off', { flag: false }],
    ['no fast model is configured', { fastModel: false }],
    ['the settings cannot be read', { flagError: true }],
  ])('sits the execution out when %s', async (_name, options) => {
    const { definition, execution } = setup(options);

    expect(await definition.getHandler(execution)).toBeUndefined();
    expect(selectRelevantSkillsMock).not.toHaveBeenCalled();
  });

  it('asks the selector about the request with the recent exchanges, and appends the notice', async () => {
    const { definition, execution, modelProvider, logger } = setup();
    const skills = [relevant('alpha', 'matches the request'), relevant('beta')];
    selectRelevantSkillsMock.mockResolvedValue({ skills });
    const abortSignal = new AbortController().signal;
    const api: CycleHookApi = { append: jest.fn() };

    const handler = await definition.getHandler(execution);
    await handler!({ abortSignal } as CycleContext, api);

    expect(selectRelevantSkillsMock).toHaveBeenCalledWith({
      skills: execution.agent.skills,
      context: {
        userMessage: 'current request',
        recentContext: buildRecentContext([
          { input: { message: 'first question' }, response: { message: 'first answer' } },
          { input: { message: 'posted with no run' }, response: undefined },
        ]),
      },
      modelProvider,
      logger,
      abortSignal,
    });
    expect(api.append).toHaveBeenCalledWith({
      text: formatRelevantSkillsNotice(skills),
      data: {
        source: 'implicit',
        skills: [
          {
            id: 'alpha',
            name: 'alpha',
            path: '/skills/alpha',
            description: 'alpha description',
            relevance_note: 'matches the request',
          },
          {
            id: 'beta',
            name: 'beta',
            path: '/skills/beta',
            description: 'beta description',
            relevance_note: null,
          },
        ],
      },
    });
  });

  it('appends nothing when no skill is relevant', async () => {
    const { definition, execution } = setup();
    selectRelevantSkillsMock.mockResolvedValue({ skills: [] });
    const api: CycleHookApi = { append: jest.fn() };

    const handler = await definition.getHandler(execution);
    await handler!({ abortSignal: new AbortController().signal } as CycleContext, api);

    expect(api.append).not.toHaveBeenCalled();
  });
});
