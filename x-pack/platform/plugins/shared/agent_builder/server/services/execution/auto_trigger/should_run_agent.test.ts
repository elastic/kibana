/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import {
  savedObjectsServiceMock,
  securityServiceMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import type { ConversationWithPermissions } from '@kbn/agent-builder-common';
import { ConversationAccessControlMode } from '@kbn/agent-builder-common';
import type { DecideResult } from '@kbn/agent-builder-server';
import {
  createAgentsServiceStartMock,
  createConversationClientMock,
  createEmptyConversation,
  createMockedAgentRegistry,
  createMockedInternalAgent,
} from '../../../test_utils';
import { shouldRespondQuestions } from './build_trigger_decision_input';
import { shouldRunAgent } from './should_run_agent';

const sharedAccessControl = {
  access_mode: ConversationAccessControlMode.Public,
  entries: [],
};

type AccessControl = ConversationWithPermissions['access_control'];

const setup = (
  options: {
    experimental?: boolean | Error;
    accessControl?: AccessControl;
    decideResult?: DecideResult;
  } = {}
) => {
  const { experimental = true, decideResult = { status: 'unavailable' } } = options;
  const accessControl = 'accessControl' in options ? options.accessControl : sharedAccessControl;

  const uiSettings = uiSettingsServiceMock.createStartContract();
  const uiSettingsClient = uiSettingsServiceMock.createClient();
  const savedObjects = savedObjectsServiceMock.createStartContract();
  const security = securityServiceMock.createStart();
  const conversationClient = createConversationClientMock();
  const agentService = createAgentsServiceStartMock();
  const agentRegistry = createMockedAgentRegistry();
  const decide = jest.fn().mockResolvedValue(decideResult);

  uiSettings.asScopedToClient.mockReturnValue(uiSettingsClient);
  uiSettingsClient.get.mockImplementation(async (key: string) => {
    if (experimental instanceof Error) {
      throw experimental;
    }
    return key === AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID ? experimental : undefined;
  });

  conversationClient.get.mockResolvedValue(
    createEmptyConversation({ id: 'conversation-1', access_control: accessControl })
  );
  agentService.getRegistry.mockResolvedValue(agentRegistry);
  agentRegistry.get.mockResolvedValue(createMockedInternalAgent({ id: 'agent-1' }));

  const run = ({ withConversation = true }: { withConversation?: boolean } = {}) =>
    shouldRunAgent({
      request: httpServerMock.createKibanaRequest(),
      params: {
        conversationId: withConversation ? 'conversation-1' : undefined,
        nextInput: { message: '@agent can you help?' },
      },
      deps: {
        logger: loggerMock.create(),
        uiSettings,
        savedObjects,
        security,
        conversationService: {
          getScopedClient: jest.fn().mockResolvedValue(conversationClient),
        },
        agentService,
        decisions: { decide },
        decisionConfig: { triggerThreshold: 0.5, timeoutMs: 2000 },
      },
    });

  return { run, decide };
};

const predicate = (probability: number): DecideResult => ({
  status: 'decided',
  inferenceId: 'decision-1',
  answers: { should_respond: { type: 'predicate', probability } },
});

describe('shouldRunAgent', () => {
  it('runs without deciding when there is no conversation id', async () => {
    const { run, decide } = setup();

    expect(await run({ withConversation: false })).toBe(true);
    expect(decide).not.toHaveBeenCalled();
  });

  it('runs without deciding when the experimental flag is off', async () => {
    const { run, decide } = setup({ experimental: false });

    expect(await run()).toBe(true);
    expect(decide).not.toHaveBeenCalled();
  });

  it('runs without deciding when reading the flag throws', async () => {
    const { run, decide } = setup({ experimental: new Error('settings unavailable') });

    expect(await run()).toBe(true);
    expect(decide).not.toHaveBeenCalled();
  });

  it.each([
    ['no access control', undefined],
    ['private access control', { access_mode: ConversationAccessControlMode.Private, entries: [] }],
  ])('runs without deciding for a private conversation (%s)', async (_, accessControl) => {
    const { run, decide } = setup({ accessControl });

    expect(await run()).toBe(true);
    expect(decide).not.toHaveBeenCalled();
  });

  it('asks should_respond for a shared conversation', async () => {
    const { run, decide } = setup({ decideResult: predicate(0.9) });

    await run();

    expect(decide).toHaveBeenCalledWith(
      expect.objectContaining({
        questions: shouldRespondQuestions,
        timeoutMs: 2000,
        input: expect.stringContaining('@agent can you help?'),
      })
    );
  });

  it.each([
    [0.5, true],
    [0.49, false],
  ])('with probability %s runs the agent: %s', async (probability, expected) => {
    const { run } = setup({ decideResult: predicate(probability) });

    expect(await run()).toBe(expected);
  });

  it('runs when decide returns unavailable', async () => {
    const { run } = setup({ decideResult: { status: 'unavailable' } });

    expect(await run()).toBe(true);
  });

  it('runs when decide returns failed', async () => {
    const { run } = setup({ decideResult: { status: 'failed', error: new Error('boom') } });

    expect(await run()).toBe(true);
  });

  it.each<[string, DecideResult]>([
    ['missing', { status: 'decided', inferenceId: 'decision-1', answers: {} }],
    [
      'not a predicate',
      {
        status: 'decided',
        inferenceId: 'decision-1',
        answers: {
          should_respond: { type: 'choice', choice: 'no', confidence: 1, probabilities: {} },
        },
      },
    ],
  ])('runs when the answer is %s', async (_, decideResult) => {
    const { run } = setup({ decideResult });

    expect(await run()).toBe(true);
  });
});
