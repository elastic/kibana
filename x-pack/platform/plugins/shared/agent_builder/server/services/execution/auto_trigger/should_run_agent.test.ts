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
import type { ConversationWithPermissions, ConverseInput } from '@kbn/agent-builder-common';
import { ConversationAccessControlMode } from '@kbn/agent-builder-common';
import type { DecideResult } from '@kbn/agent-builder-server';
import type { DecisionPredicateAnswer } from '@kbn/inference-common';
import {
  createAgentsServiceStartMock,
  createConversationClientMock,
  createEmptyConversation,
  createMockedAgentRegistry,
  createMockedInternalAgent,
} from '../../../test_utils';
import { shouldRespondQuestion } from './build_trigger_decision_input';
import { shouldRunAgent } from './should_run_agent';

const span = { setAttributes: jest.fn() };
const spanNames: string[] = [];

jest.mock('@kbn/inference-tracing', () => ({
  ...jest.requireActual('@kbn/inference-tracing'),
  withActiveInferenceSpan: (
    name: string,
    opts: { attributes?: Record<string, unknown> },
    cb: (s: typeof span) => unknown
  ) => {
    spanNames.push(name);
    span.setAttributes(opts.attributes);
    return cb(span);
  },
}));

const sharedAccessControl = {
  access_mode: ConversationAccessControlMode.Public,
  entries: [],
};

type AutoTriggerDecideResult = DecideResult<{ answer: DecisionPredicateAnswer }>;

type AccessControl = ConversationWithPermissions['access_control'];

const setup = (
  options: {
    experimental?: boolean | Error;
    accessControl?: AccessControl;
    decideResult?: AutoTriggerDecideResult;
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

  const run = ({
    withConversation = true,
    nextInput = { message: '@agent can you help?' },
    abortSignal,
  }: {
    withConversation?: boolean;
    nextInput?: ConverseInput;
    abortSignal?: AbortSignal;
  } = {}) =>
    shouldRunAgent({
      request: httpServerMock.createKibanaRequest(),
      abortSignal,
      params: {
        conversationId: withConversation ? 'conversation-1' : undefined,
        nextInput,
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
        decisionConfig: { triggerThreshold: 0.5 },
      },
    });

  return { run, decide };
};

const predicate = (probability: number): AutoTriggerDecideResult => ({
  status: 'decided',
  inferenceId: 'decision-1',
  answer: { type: 'predicate', probability },
});

describe('shouldRunAgent', () => {
  beforeEach(() => {
    span.setAttributes.mockClear();
    spanNames.length = 0;
  });

  it('records the decision on an auto_trigger span for the conversation', async () => {
    const { run } = setup({ decideResult: predicate(0.2) });

    await run();

    expect(spanNames).toEqual(['auto_trigger']);
    expect(span.setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({ 'gen_ai.conversation.id': 'conversation-1' })
    );
    expect(span.setAttributes).toHaveBeenCalledWith({
      'elastic.auto_trigger.status': 'decided',
      'elastic.auto_trigger.inference_id': 'decision-1',
      'elastic.auto_trigger.probability': 0.2,
      'elastic.auto_trigger.threshold': 0.5,
      'elastic.auto_trigger.run': false,
    });
  });

  it('records the fallback on the auto_trigger span when no decision is available', async () => {
    const { run } = setup({ decideResult: { status: 'unavailable' } });

    await run();

    expect(span.setAttributes).toHaveBeenCalledWith({
      'elastic.auto_trigger.status': 'unavailable',
      'elastic.auto_trigger.run': true,
    });
  });

  it('does not open a span when it skips the decision', async () => {
    const { run } = setup({ experimental: false });

    await run();

    expect(spanNames).toEqual([]);
  });

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

  it('runs without deciding for a prompt response', async () => {
    const { run, decide } = setup({ decideResult: predicate(0) });

    expect(await run({ nextInput: { prompts: { 'prompt-1': { allow: true } } } })).toBe(true);
    expect(decide).not.toHaveBeenCalled();
  });

  it('runs without deciding for a message without text or attachments', async () => {
    const { run, decide } = setup({ decideResult: predicate(0) });

    expect(await run({ nextInput: { message: '   ' } })).toBe(true);
    expect(decide).not.toHaveBeenCalled();
  });

  it('passes the abort signal to decide', async () => {
    const { run, decide } = setup({ decideResult: predicate(0.9) });
    const { signal } = new AbortController();

    await run({ abortSignal: signal });

    expect(decide).toHaveBeenCalledWith(
      expect.objectContaining({ abortSignal: signal }),
      shouldRespondQuestion
    );
  });

  it('asks should_respond for a shared conversation', async () => {
    const { run, decide } = setup({ decideResult: predicate(0.9) });

    await run();

    expect(decide).toHaveBeenCalledWith(
      expect.objectContaining({ input: expect.stringContaining('@agent can you help?') }),
      shouldRespondQuestion
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
});
