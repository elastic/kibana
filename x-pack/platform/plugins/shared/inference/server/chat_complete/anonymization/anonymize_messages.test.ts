/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlInferenceResponseResult } from '@elastic/elasticsearch/lib/api/types';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { anonymizeMessages } from './anonymize_messages';
import {
  AnonymizationRule,
  AssistantMessage,
  Message,
  MessageRole,
  UserMessage,
} from '@kbn/inference-common';
import { messageToAnonymizationRecords } from './message_to_anonymization_records';
import { getEntityMask } from './get_entity_mask';
import { RegexWorkerService } from './regex_worker_service';
import { AnonymizationWorkerConfig } from '../../config';
const mockEsClient = {
  ml: {
    inferTrainedModel: jest.fn(),
  },
} as any;
const testConfig = {
  enabled: false,
} as AnonymizationWorkerConfig;
describe('anonymizeMessages', () => {
  let logger: MockedLogger;
  let regexWorker: RegexWorkerService;
  beforeEach(() => {
    jest.resetAllMocks();
    logger = loggerMock.create();
    regexWorker = new RegexWorkerService(testConfig, logger);
  });

  const setupMockResponse = (entities: MlInferenceResponseResult[]) => {
    mockEsClient.ml.inferTrainedModel.mockResolvedValue({
      inference_results: entities,
    });
  };

  const nerRule: AnonymizationRule = {
    type: 'NER',
    enabled: true,
    modelId: 'model-1',
    allowedEntityClasses: ['PER'],
  };

  const disabledRule: AnonymizationRule = { ...nerRule, enabled: false };

  const regexRule: AnonymizationRule = {
    type: 'RegExp',
    enabled: true,
    entityClass: 'EMAIL',
    pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
  };

  it('should preserve JSON structure when anonymizing', async () => {
    const messages: Message[] = [
      {
        role: MessageRole.Assistant,
        content: '',
        toolCalls: [
          {
            function: {
              name: 'search',
              arguments: { query: 'Search for Bob in database' },
            },
            toolCallId: '123',
          },
        ],
      },
    ];

    const serialized = messageToAnonymizationRecords(messages[0]);

    setupMockResponse([
      {
        predicted_value: '',
        entities: [
          {
            entity: 'Bob',
            class_name: 'PER',
            class_probability: 0.9828533515650252,
            start_pos: serialized.data!.indexOf('Bob'),
            end_pos: serialized.data!.indexOf('Bob') + 3,
          },
        ],
      },
    ]);

    // Execute
    const result = await anonymizeMessages({
      messages,
      anonymizationRules: [nerRule],
      regexWorker,
      esClient: mockEsClient,
    });

    const assistantMsgResult = result.messages[0] as AssistantMessage & {
      toolCalls: Array<{ function: { arguments: Record<string, any> } }>;
    };
    const args = assistantMsgResult.toolCalls![0].function.arguments;
    expect(args).toHaveProperty('query');
    expect(args.query).not.toContain('Bob');
  });

  it('should handle empty string content', async () => {
    const messages: Message[] = [
      {
        role: MessageRole.Assistant,
        content: '',
        toolCalls: [
          {
            function: {
              name: 'test',
              arguments: {},
            },
            toolCallId: '123',
          },
        ],
      },
    ];

    setupMockResponse([
      {
        entities: [],
      },
    ]);

    await expect(
      anonymizeMessages({
        messages,
        anonymizationRules: [nerRule],
        regexWorker,
        esClient: mockEsClient,
      })
    ).resolves.toBeDefined();
  });

  it('returns original messages when all rules are disabled', async () => {
    const messages: Message[] = [{ role: MessageRole.User, content: 'Nothing to see here' }];

    const result = await anonymizeMessages({
      messages,
      anonymizationRules: [disabledRule],
      regexWorker,
      esClient: mockEsClient,
    });

    expect(result.messages).toBe(messages); // same reference
    expect(result.anonymizations.length).toBe(0);
    expect(mockEsClient.ml.inferTrainedModel).not.toHaveBeenCalled();
  });

  it('maintains ordering with multiple messages', async () => {
    const messages: Message[] = [
      { role: MessageRole.User, content: 'First' },
      { role: MessageRole.Assistant, content: 'Second' },
    ];

    const result = await anonymizeMessages({
      messages,
      anonymizationRules: [disabledRule],
      regexWorker,
      esClient: mockEsClient,
    });

    expect((result.messages[0] as UserMessage).content).toBe('First');
    expect((result.messages[1] as AssistantMessage).content).toBe('Second');
  });

  it('handles content parts', async () => {
    const messages: Message[] = [
      {
        role: MessageRole.User,
        content: [
          {
            text: 'foo',
            type: 'text',
          },
          {
            text: 'jorge21@gmail.com',
            type: 'text',
          },
        ],
      },
    ];

    const result = await anonymizeMessages({
      messages,
      anonymizationRules: [regexRule],
      regexWorker,
      esClient: mockEsClient,
    });

    expect((result.messages[0] as UserMessage).content).toEqual([
      {
        type: 'text',
        text: 'foo',
      },
      {
        type: 'text',
        text: getEntityMask({ class_name: 'EMAIL', value: 'jorge21@gmail.com' }),
      },
    ]);
  });

  it('anonymizes assistant message with multiple tool calls', async () => {
    const messages = [
      {
        role: MessageRole.Assistant,
        content: '',
        toolCalls: [
          {
            function: {
              name: 'search',
              arguments: { query: 'Find Bob in db' },
            },
            toolCallId: '1',
          },
          {
            function: {
              name: 'lookup',
              arguments: { query: 'Bob details' },
            },
            toolCallId: '2',
          },
        ],
      } as Omit<AssistantMessage, 'toolCalls'> & {
        toolCalls: Array<{
          toolCallId: string;
          function: { name: string; arguments: { query: string } };
        }>;
      },
    ];

    const serialized = messageToAnonymizationRecords(messages[0]);

    setupMockResponse([
      {
        predicted_value: '',
        entities: [
          {
            entity: 'Bob',
            class_name: 'PER',
            class_probability: 0.99,
            start_pos: serialized.data!.indexOf('Bob'),
            end_pos: serialized.data!.indexOf('Bob') + 3,
          },
          {
            entity: 'Bob',
            class_name: 'PER',
            class_probability: 0.99,
            start_pos: serialized.data!.lastIndexOf('Bob'),
            end_pos: serialized.data!.lastIndexOf('Bob') + 3,
          },
        ],
      },
    ]);

    const result = await anonymizeMessages({
      messages,
      regexWorker,
      anonymizationRules: [nerRule],
      esClient: mockEsClient,
    });

    const assistant = result.messages[0] as (typeof messages)[0];

    assistant.toolCalls.forEach((call) => {
      expect(call.function.arguments.query).not.toContain('Bob');
    });
  });
  it('anonymizes the system prompt', async () => {
    const systemPrompt = `<ConversationHistory>
  [
   {
     "@timestamp": "2025-07-01T15:48:59.044Z",
     "message": {
       "role": "user",
       "content": "my name is jorge"
     }
   }
  ]
  </ConversationHistory>`;

    const start = systemPrompt.indexOf('jorge');
    const end = start + 'jorge'.length;

    setupMockResponse([
      {
        entities: [
          {
            entity: 'jorge',
            class_name: 'PER',
            start_pos: start,
            end_pos: end,
            class_probability: 0.99,
          },
        ],
      },
    ]);

    const result = await anonymizeMessages({
      system: systemPrompt,
      messages: [],
      anonymizationRules: [nerRule],
      regexWorker,
      esClient: mockEsClient,
    });
    expect(result.system).toBe(
      '<ConversationHistory>\n' +
        '  [\n' +
        '   {\n' +
        '     "@timestamp": "2025-07-01T15:48:59.044Z",\n' +
        '     "message": {\n' +
        '       "role": "user",\n' +
        '       "content": "my name is PER_ee4587b4ba681e38996a1b716facbf375786bff7"\n' +
        '     }\n' +
        '   }\n' +
        '  ]\n' +
        '  </ConversationHistory>'
    );
  });
  it('anonymizes only allowed entity classes as defined in NER rule', async () => {
    const userText = 'my name is jorge and I live in los angeles';

    const startJorge = userText.indexOf('jorge');
    const endJorge = startJorge + 'jorge'.length;

    const startLA = userText.indexOf('los angeles');
    const endLA = startLA + 'los angeles'.length;

    setupMockResponse([
      {
        entities: [
          {
            entity: 'jorge',
            class_name: 'PER',
            start_pos: startJorge,
            end_pos: endJorge,
            class_probability: 0.99,
          },
          {
            entity: 'los angeles',
            class_name: 'LOC',
            start_pos: startLA,
            end_pos: endLA,
            class_probability: 0.99,
          },
        ],
      },
    ]);

    const { messages: maskedMsgs } = await anonymizeMessages({
      messages: [
        {
          role: MessageRole.User,
          content: userText,
        },
      ],
      anonymizationRules: [nerRule], // nerRule allows only PER
      regexWorker,
      esClient: mockEsClient,
    });

    const maskedContent = (maskedMsgs[0] as UserMessage).content;

    expect(maskedContent).toBe(
      'my name is PER_ee4587b4ba681e38996a1b716facbf375786bff7 and I live in los angeles'
    );
  });
});
