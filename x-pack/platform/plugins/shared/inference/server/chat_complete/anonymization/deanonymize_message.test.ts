/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, lastValueFrom } from 'rxjs';
import { toArray } from 'rxjs';
import type {
  Anonymization,
  AnonymizationOutput,
  AnonymizationRule,
  AssistantMessage,
  ChatCompleteAPI,
  ChatCompletionChunkEvent,
  ChatCompletionEvent,
  ChatCompletionMessageEvent,
  UserMessage,
} from '@kbn/inference-common';
import {
  ChatCompletionEventType,
  InferenceConnectorType,
  MessageRole,
} from '@kbn/inference-common';
import { InferenceChatModel } from '@kbn/inference-langchain';
import type { AIMessageChunk } from '@langchain/core/messages';
import { deanonymizeMessage } from './deanonymize_message';
import { chunkEvent, messageEvent, tokensEvent, createMask } from '../../test_utils';
import { anonymizeMessages } from './anonymize_messages';
import { mergeChunks } from '../utils/merge_chunks';
import { RegexWorkerService } from './regex_worker_service';
import type { AnonymizationWorkerConfig } from '../../config';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';

const testConfig = {
  enabled: false,
} as AnonymizationWorkerConfig;

/** Concatenates the `content` of every chunk-type event, in order, mirroring how a streaming client rebuilds the response. */
function concatenateChunkContent(events: ChatCompletionEvent[]): string {
  return events
    .filter(
      (event): event is ChatCompletionChunkEvent =>
        event.type === ChatCompletionEventType.ChatCompletionChunk
    )
    .map((event) => event.content)
    .join('');
}

function lastChunkEvent(events: ChatCompletionEvent[]): ChatCompletionChunkEvent {
  const chunks = events.filter(
    (event): event is ChatCompletionChunkEvent =>
      event.type === ChatCompletionEventType.ChatCompletionChunk
  );
  return chunks[chunks.length - 1];
}

describe('deanonymizeMessage', () => {
  let logger: MockedLogger;
  let regexWorker: RegexWorkerService;
  beforeEach(() => {
    jest.resetAllMocks();
    logger = loggerMock.create();
    regexWorker = new RegexWorkerService(testConfig, logger);
  });

  it('passes through all events unchanged when there are no anonymizations', async () => {
    const events = [chunkEvent('chunk'), tokensEvent(), messageEvent('message')];

    const anonymizationOutput: AnonymizationOutput = {
      messages: [],
      anonymizations: [],
    } as AnonymizationOutput;

    const result = await lastValueFrom(
      from(events).pipe(deanonymizeMessage(anonymizationOutput), toArray())
    );

    expect(result).toEqual(events);
  });

  it('streams incrementally deanonymized chunks and a final message, instead of collapsing into one chunk', async () => {
    const value = 'Bob';
    const mask = createMask('PER', value);

    const anonymization: Anonymization = {
      entity: {
        class_name: 'PER',
        value,
        mask,
      },
      rule: { type: 'NER' },
    } as Anonymization;

    // Original input message provided to the LLM (needed for deanonymized_input metadata)
    const originalUserMessage: UserMessage = {
      role: MessageRole.User,
      content: `Hi, I am ${mask}.`,
    };

    const anonymizationOutput: AnonymizationOutput = {
      messages: [originalUserMessage],
      anonymizations: [anonymization],
      replacementsId: 'replacements-123',
    } as AnonymizationOutput;

    // Chunk content must genuinely sum to the message content, as it does in real streaming.
    const chunks = [chunkEvent(`Hi, I am `), chunkEvent(`${mask}.`)];
    const msg = messageEvent(`Hi, I am ${mask}.`);

    const result = await lastValueFrom(
      from([...chunks, msg]).pipe(deanonymizeMessage(anonymizationOutput), toArray())
    );

    // Real chunk events must survive (not be filtered out and replaced by a single one).
    const chunkEvents = result.filter(
      (event): event is ChatCompletionChunkEvent =>
        event.type === ChatCompletionEventType.ChatCompletionChunk
    );
    expect(chunkEvents.length).toBeGreaterThan(1);

    const messageOut = result[result.length - 1] as ChatCompletionMessageEvent;
    expect(messageOut.type).toBe(ChatCompletionEventType.ChatCompletionMessage);

    // Reconstructed content (as a streaming client would build it) must be fully deanonymized.
    const reconstructed = concatenateChunkContent(result);
    expect(reconstructed).toBe(`Hi, I am ${value}.`);
    expect(reconstructed).not.toContain(mask);
    expect(messageOut.content).toBe(`Hi, I am ${value}.`);
    expect(messageOut.content).not.toContain(mask);

    // Metadata must be present on every chunk and on the message.
    for (const event of [...chunkEvents, messageOut]) {
      expect(event.metadata?.anonymization?.replacementsId).toBe('replacements-123');
    }

    // Downstream consumers (observability_ai_assistant's emitWithConcatenatedMessage) read
    // deanonymized_input/deanonymized_output off the *last* chunk event, not the message event.
    const lastChunk = lastChunkEvent(result);
    const outputMsg = lastChunk.deanonymized_output?.message as AssistantMessage;
    expect(outputMsg.content).toBe(`Hi, I am ${value}.`);
    expect(outputMsg.content).not.toContain(mask);
    expect((lastChunk.deanonymized_input?.[0].message as UserMessage).content).toBe(
      `Hi, I am ${value}.`
    );
    expect((messageOut.deanonymized_input?.[0].message as UserMessage).content).toBe(
      `Hi, I am ${value}.`
    );
  });

  it('holds back a mask split across chunk boundaries until it is complete', async () => {
    const value = 'jorge@gmail.com';
    const mask = createMask('EMAIL', value);

    const anonymization: Anonymization = {
      entity: { class_name: 'EMAIL', value, mask },
      rule: { type: 'RegExp' },
    } as Anonymization;

    const anonymizationOutput: AnonymizationOutput = {
      messages: [],
      anonymizations: [anonymization],
    } as AnonymizationOutput;

    const fullContent = `Your email is ${mask}.`;
    // Split into realistic tokenizer-sized fragments, several of which land mid-mask,
    // including one boundary that leaves only a single dangling character of the mask
    // ("E") — the exact case that breaks alignment if a lone leading character is flushed.
    const chunks = [
      'Your email is ',
      mask.slice(0, 1),
      mask.slice(1, 9),
      mask.slice(9, 20),
      mask.slice(20),
      '.',
    ].map((fragment) => chunkEvent(fragment));
    const msg = messageEvent(fullContent);

    const result = await lastValueFrom(
      from([...chunks, msg]).pipe(deanonymizeMessage(anonymizationOutput), toArray())
    );

    // None of the individual chunk contents should ever contain the raw (unresolved) mask.
    const chunkEvents = result.filter(
      (event): event is ChatCompletionChunkEvent =>
        event.type === ChatCompletionEventType.ChatCompletionChunk
    );
    for (const chunk of chunkEvents) {
      expect(chunk.content).not.toContain('EMAIL_');
    }

    const reconstructed = concatenateChunkContent(result);
    expect(reconstructed).toBe(`Your email is ${value}.`);
  });

  it('maps deanonymizations correctly for multiple input messages', async () => {
    const val1 = 'Bob';
    const val2 = 'Alice';
    const val3 = 'Charlie';

    const mask1 = createMask('PER', val1);
    const mask2 = createMask('PER', val2);
    const mask3 = createMask('PER', val3);

    const anonymizations: Anonymization[] = [
      {
        entity: { class_name: 'PER', value: val1, mask: mask1 },
        rule: { type: 'NER' },
      },
      {
        entity: { class_name: 'PER', value: val2, mask: mask2 },
        rule: { type: 'NER' },
      },
      {
        entity: { class_name: 'PER', value: val3, mask: mask3 },
        rule: { type: 'NER' },
      },
    ] as Anonymization[];

    const userMsg1: UserMessage = {
      role: MessageRole.User,
      content: `I am ${mask1}.`,
    };

    const assistantMsg: AssistantMessage = {
      role: MessageRole.Assistant,
      content: `Nice to meet you ${mask2}!`,
    };

    const userMsg2: UserMessage = {
      role: MessageRole.User,
      content: `Also here is ${mask3}.`,
    };

    const anonymizationOutput: AnonymizationOutput = {
      messages: [userMsg1, assistantMsg, userMsg2],
      anonymizations,
    } as AnonymizationOutput;

    const content = `Reply concerning ${mask1} and ${mask2} and ${mask3}`;
    const chunk: ChatCompletionChunkEvent = chunkEvent(content);
    const msg = messageEvent(content);

    const result = await lastValueFrom(
      from([chunk, msg]).pipe(deanonymizeMessage(anonymizationOutput), toArray())
    );

    const lastChunk = lastChunkEvent(result);

    // Expect deanonymized_input to have three entries with correct mappings
    expect(lastChunk.deanonymized_input).toHaveLength(3);

    const [firstInputItem, secondInputItem, thirdInputItem] = lastChunk.deanonymized_input!;

    // First user message
    expect((firstInputItem.message as UserMessage).content).toBe(`I am ${val1}.`);
    expect(firstInputItem.deanonymizations).toHaveLength(1);
    expect(firstInputItem.deanonymizations[0].entity).toEqual({
      class_name: 'PER',
      value: val1,
      mask: mask1,
    });

    // Assistant message
    expect((secondInputItem.message as AssistantMessage).content).toBe(`Nice to meet you ${val2}!`);
    expect(secondInputItem.deanonymizations).toHaveLength(1);
    expect(secondInputItem.deanonymizations[0].entity).toEqual({
      class_name: 'PER',
      value: val2,
      mask: mask2,
    });

    // Second user message
    expect((thirdInputItem.message as UserMessage).content).toBe(`Also here is ${val3}.`);
    expect(thirdInputItem.deanonymizations).toHaveLength(1);
    expect(thirdInputItem.deanonymizations[0].entity).toEqual({
      class_name: 'PER',
      value: val3,
      mask: mask3,
    });

    // Verify deanonymized output, reconstructed from the incremental chunk stream
    const reconstructed = concatenateChunkContent(result);
    expect(reconstructed).toBe(`Reply concerning ${val1} and ${val2} and ${val3}`);

    // Deanonymized output should include all three deanonymizations, on both the last chunk
    // and the message event.
    const expectedEntities = [mask1, mask2, mask3];
    const messageOut = result[result.length - 1] as ChatCompletionMessageEvent;

    const chunkEntities = lastChunk.deanonymized_output?.deanonymizations.map((d) => d.entity.mask);
    expect(chunkEntities).toEqual(expect.arrayContaining(expectedEntities));

    expect(messageOut.deanonymized_output?.deanonymizations.map((d) => d.entity.mask)).toEqual(
      expect.arrayContaining(expectedEntities)
    );
  });

  it('deanonymizes HOST_NAME masks produced by anonymizeMessages', async () => {
    const websiteRule: AnonymizationRule = {
      type: 'RegExp',
      enabled: true,
      entityClass: 'HOST_NAME',
      pattern: '\\b(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,}\\b',
    };

    const originalContent = `try http://sub.domain.co.uk.`;

    const { messages: maskedMsgs, anonymizations } = await anonymizeMessages({
      regexWorker,
      messages: [
        {
          role: MessageRole.User,
          content: originalContent,
        },
      ],
      anonymizationRules: [websiteRule],
      esClient: { ml: { inferTrainedModel: jest.fn() } } as any, // no ML calls for regex rules
    });

    const maskedUserContent = (maskedMsgs[0] as UserMessage).content as string;

    // Simulate stream events produced by the model
    const maskedChunkEvent = chunkEvent(maskedUserContent);
    const maskedMessageEvent = messageEvent(maskedUserContent);

    const result = await lastValueFrom(
      from([maskedChunkEvent, maskedMessageEvent]).pipe(
        deanonymizeMessage({ messages: maskedMsgs, anonymizations }),
        toArray()
      )
    );

    const messageOut = result[result.length - 1] as ChatCompletionMessageEvent;
    const reconstructed = concatenateChunkContent(result);

    expect(reconstructed).toBe(originalContent);
    expect(messageOut.content).toBe(originalContent);

    // Calculate exact positions in original content for each entity
    const urlStart = originalContent.indexOf('sub.domain.co.uk');
    const urlEnd = urlStart + 'sub.domain.co.uk'.length;

    const expectedDeanonymizations = [
      {
        start: urlStart,
        end: urlEnd,
        entity: anonymizations.find((a) => a.entity.class_name === 'HOST_NAME')!.entity,
      },
    ];

    expect(messageOut.deanonymized_output?.deanonymizations).toEqual(
      expect.arrayContaining(expectedDeanonymizations)
    );
  });

  it('correctly maps deanonymizations when a single message contains multiple entities', async () => {
    const name = 'Jorge';
    const city = 'Mission Viejo';

    const nameMask = createMask('PER', name);
    const cityMask = createMask('LOC', city);

    const anonymizations: Anonymization[] = [
      { entity: { class_name: 'PER', value: name, mask: nameMask }, rule: { type: 'NER' } },
      { entity: { class_name: 'LOC', value: city, mask: cityMask }, rule: { type: 'NER' } },
    ];

    const originalUserMsg: UserMessage = {
      role: MessageRole.User,
      content: `${nameMask} is from ${cityMask}`,
    };

    const anonymizationOutput: AnonymizationOutput = {
      messages: [originalUserMsg],
      anonymizations,
    } as AnonymizationOutput;

    const chunk = chunkEvent(originalUserMsg.content as string);
    const msg = messageEvent(originalUserMsg.content as string);

    const result = await lastValueFrom(
      from([chunk, msg]).pipe(deanonymizeMessage(anonymizationOutput), toArray())
    );

    const expectedContent = `${name} is from ${city}`;
    const reconstructed = concatenateChunkContent(result);
    const messageOut = result[result.length - 1] as ChatCompletionMessageEvent;

    expect(reconstructed).toBe(expectedContent);
    expect(messageOut.content).toBe(expectedContent);

    // Offsets
    const nameStart = 0;
    const nameEnd = name.length;
    const cityStart = expectedContent.indexOf(city);
    const cityEnd = cityStart + city.length;

    const deanonymizations = messageOut.deanonymized_output!.deanonymizations;
    expect(deanonymizations).toEqual(
      expect.arrayContaining([
        { start: nameStart, end: nameEnd, entity: anonymizations[0].entity },
        { start: cityStart, end: cityEnd, entity: anonymizations[1].entity },
      ])
    );
  });

  describe('tool calls', () => {
    const value = 'jorge@gmail.com';
    const mask = createMask('EMAIL', value);

    const anonymizationOutput: AnonymizationOutput = {
      messages: [{ role: MessageRole.User, content: `Email ${mask}` }],
      anonymizations: [{ entity: { class_name: 'EMAIL', value, mask }, rule: { type: 'RegExp' } }],
    };

    const createToolCallEvents = () => [
      chunkEvent('', [
        {
          index: 0,
          toolCallId: 'call-1',
          function: { name: 'sendEmail', arguments: `{"to":"${mask}"}` },
        },
      ]),
      messageEvent('', [
        {
          toolCallId: 'call-1',
          function: { name: 'sendEmail', arguments: { to: mask } },
        },
      ]),
    ];

    it('preserves tool call ids in the deanonymized chunk and message', async () => {
      const [chunkOut, msgOut] = (await lastValueFrom(
        from(createToolCallEvents()).pipe(deanonymizeMessage(anonymizationOutput), toArray())
      )) as [ChatCompletionChunkEvent, ChatCompletionMessageEvent];

      expect(chunkOut.tool_calls).toEqual([
        {
          index: 0,
          toolCallId: 'call-1',
          function: { name: 'sendEmail', arguments: JSON.stringify({ to: value }) },
        },
      ]);
      expect(msgOut.toolCalls).toEqual([
        {
          toolCallId: 'call-1',
          function: { name: 'sendEmail', arguments: { to: value } },
        },
      ]);
      expect((msgOut.deanonymized_output?.message as AssistantMessage).toolCalls).toEqual(
        msgOut.toolCalls
      );
    });

    it('produces valid LangChain tool calls', async () => {
      const chatComplete: ChatCompleteAPI & jest.MockedFn<ChatCompleteAPI> = jest.fn();
      chatComplete.mockReturnValue(
        from(createToolCallEvents()).pipe(deanonymizeMessage(anonymizationOutput))
      );

      const chatModel = new InferenceChatModel({
        connector: {
          type: InferenceConnectorType.Inference,
          connectorId: 'connector-id',
          name: 'My connector',
          config: {},
          capabilities: {},
          isInferenceEndpoint: false,
          isPreconfigured: false,
        },
        chatComplete,
      });

      let output: AIMessageChunk | undefined;
      for await (const chunk of await chatModel.stream('Send an email')) {
        output = output ? output.concat(chunk) : chunk;
      }

      expect(output?.tool_calls).toEqual([
        { id: 'call-1', name: 'sendEmail', args: { to: value }, type: 'tool_call' },
      ]);
      expect(output?.invalid_tool_calls).toEqual([]);
    });
  });

  it('emits final-string-valid deanonymization ranges for input/output when regex ordering differs from text ordering', async () => {
    const name = 'john';
    const email = 'john123@gmail.com';
    const nameMask = `PER_${'a'.repeat(40)}`;
    const emailMask = `EMAIL_${'b'.repeat(40)}`;

    // Reflect regex-first processing order while PER appears first in text.
    const anonymizations: Anonymization[] = [
      { entity: { class_name: 'EMAIL', value: email, mask: emailMask }, rule: { type: 'RegExp' } },
      { entity: { class_name: 'PER', value: name, mask: nameMask }, rule: { type: 'NER' } },
    ];

    const maskedContent = `my name is ${nameMask} and my email is ${emailMask}`;
    const expectedContent = `my name is ${name} and my email is ${email}`;

    const anonymizationOutput: AnonymizationOutput = {
      messages: [{ role: MessageRole.User, content: maskedContent }],
      anonymizations,
    } as AnonymizationOutput;

    const result = await lastValueFrom(
      from([chunkEvent(maskedContent), messageEvent(maskedContent)]).pipe(
        deanonymizeMessage(anonymizationOutput),
        toArray()
      )
    );

    const reconstructed = concatenateChunkContent(result);
    const messageOut = result[result.length - 1] as ChatCompletionMessageEvent;

    expect(reconstructed).toBe(expectedContent);
    expect(messageOut.content).toBe(expectedContent);

    const outputDeanonymizations = messageOut.deanonymized_output?.deanonymizations ?? [];
    const inputDeanonymizations = messageOut.deanonymized_input?.[0].deanonymizations ?? [];

    for (const deanonymization of [...outputDeanonymizations, ...inputDeanonymizations]) {
      expect(deanonymization.start).toBeGreaterThanOrEqual(0);
      expect(deanonymization.end).toBeLessThanOrEqual(expectedContent.length);
      expect(expectedContent.slice(deanonymization.start, deanonymization.end)).toBe(
        deanonymization.entity.value
      );
    }
  });
  describe('tool calls and refusals on streamed chunks', () => {
    const value = 'jorge@gmail.com';
    const mask = createMask('EMAIL', value);
    const anonymizations: Anonymization[] = [
      { entity: { class_name: 'EMAIL', value, mask }, rule: { type: 'RegExp' } },
    ];
    const anonymizationOutput: AnonymizationOutput = {
      messages: [],
      anonymizations,
    } as AnonymizationOutput;

    it('emits each tool call once, deanonymized, so concatenating chunks yields valid tool calls', async () => {
      const maskedArguments = JSON.stringify({ email: mask });
      const events = [
        chunkEvent('', [
          {
            index: 0,
            toolCallId: 'call_1',
            function: { name: 'send_email', arguments: maskedArguments.slice(0, 15) },
          },
        ]),
        chunkEvent('', [
          {
            index: 0,
            toolCallId: '',
            function: { name: '', arguments: maskedArguments.slice(15) },
          },
        ]),
        messageEvent('', [
          {
            toolCallId: 'call_1',
            function: { name: 'send_email', arguments: { email: mask } },
          },
        ]),
      ];

      const result = await lastValueFrom(
        from(events).pipe(deanonymizeMessage(anonymizationOutput), toArray())
      );

      const chunkEvents = result.filter(
        (event): event is ChatCompletionChunkEvent =>
          event.type === ChatCompletionEventType.ChatCompletionChunk
      );

      // No chunk may carry the model's raw (masked) tool call fragments.
      expect(JSON.stringify(chunkEvents.flatMap((chunk) => chunk.tool_calls))).not.toContain(mask);

      const merged = mergeChunks(chunkEvents);
      expect(merged.tool_calls).toEqual([
        {
          toolCallId: 'call_1',
          function: { name: 'send_email', arguments: JSON.stringify({ email: value }) },
        },
      ]);
      expect(JSON.parse(merged.tool_calls[0].function.arguments)).toEqual({ email: value });

      const messageOut = result[result.length - 1] as ChatCompletionMessageEvent;
      expect(messageOut.toolCalls).toEqual([
        { toolCallId: 'call_1', function: { name: 'send_email', arguments: { email: value } } },
      ]);
    });

    it('does not forward refusal fragments on streamed chunks', async () => {
      const events: ChatCompletionEvent[] = [
        { ...chunkEvent(`Hello ${mask}`), refusal: `cannot help with ${mask}` },
        messageEvent(`Hello ${mask}`),
      ];

      const result = await lastValueFrom(
        from(events).pipe(deanonymizeMessage(anonymizationOutput), toArray())
      );

      const chunkEvents = result.filter(
        (event): event is ChatCompletionChunkEvent =>
          event.type === ChatCompletionEventType.ChatCompletionChunk
      );

      expect(chunkEvents.length).toBeGreaterThan(0);
      for (const chunk of chunkEvents) {
        expect(chunk.refusal).toBeUndefined();
      }
      expect(concatenateChunkContent(result)).toBe(`Hello ${value}`);
    });
  });

  describe('when streamed and final content disagree', () => {
    it('warns, and still returns the authoritative deanonymized content on the final message event', async () => {
      const value = 'Bob';
      const mask = createMask('PER', value);
      const warnLogger = loggerMock.create();

      const result = await lastValueFrom(
        from([chunkEvent('Hello there'), messageEvent(`Hello ${mask}`)]).pipe(
          deanonymizeMessage(
            {
              messages: [],
              anonymizations: [
                { entity: { class_name: 'PER', value, mask }, rule: { type: 'NER' } },
              ],
            } as AnonymizationOutput,
            warnLogger
          ),
          toArray()
        )
      );

      expect(warnLogger.warn).toHaveBeenCalledTimes(1);
      const messageOut = result[result.length - 1] as ChatCompletionMessageEvent;
      expect(messageOut.content).toBe(`Hello ${value}`);
    });

    it('does not warn when the streamed and final content agree', async () => {
      const value = 'Bob';
      const mask = createMask('PER', value);
      const warnLogger = loggerMock.create();

      await lastValueFrom(
        from([chunkEvent(`Hello ${mask}`), messageEvent(`Hello ${mask}`)]).pipe(
          deanonymizeMessage(
            {
              messages: [],
              anonymizations: [
                { entity: { class_name: 'PER', value, mask }, rule: { type: 'NER' } },
              ],
            } as AnonymizationOutput,
            warnLogger
          ),
          toArray()
        )
      );

      expect(warnLogger.warn).not.toHaveBeenCalled();
    });
  });
});
