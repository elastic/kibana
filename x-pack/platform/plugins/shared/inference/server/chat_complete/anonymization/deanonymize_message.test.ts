/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, lastValueFrom } from 'rxjs';
import { toArray } from 'rxjs';
import {
  Anonymization,
  AnonymizationOutput,
  AnonymizationRule,
  AssistantMessage,
  ChatCompletionChunkEvent,
  ChatCompletionEventType,
  ChatCompletionMessageEvent,
  MessageRole,
  UserMessage,
} from '@kbn/inference-common';
import { deanonymizeMessage } from './deanonymize_message';
import { chunkEvent, messageEvent, tokensEvent } from '../../test_utils';
import { anonymizeMessages } from './anonymize_messages';
import { RegexWorkerService } from './regex_worker_service';
import { AnonymizationWorkerConfig } from '../../config';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';

function createMask(entityClass: string, value: string) {
  return `${entityClass}_${Buffer.from(value).toString('hex').slice(0, 40)}`;
}
const testConfig = {
  enabled: false,
} as AnonymizationWorkerConfig;
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

  it('filters out original chunk events and emits deanonymized chunk + message', async () => {
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
    } as AnonymizationOutput;

    const chunks = [chunkEvent(`Hi, I am`), chunkEvent(`${mask}.`)];
    const msg = messageEvent(`Hi, I am ${mask}.`);

    const result = await lastValueFrom(
      from([...chunks, msg]).pipe(deanonymizeMessage(anonymizationOutput), toArray())
    );

    // Should emit a new chunk + message, original chunks must be filtered out
    expect(result).toHaveLength(2);

    const [deanonymizedChunk, deanonymizedMessage] = result as [
      ChatCompletionChunkEvent,
      ChatCompletionMessageEvent
    ];

    expect(deanonymizedChunk.type).toBe(ChatCompletionEventType.ChatCompletionChunk);
    expect(deanonymizedMessage.type).toBe(ChatCompletionEventType.ChatCompletionMessage);

    // Content should be deanonymized
    expect(deanonymizedChunk.content).toBe(`Hi, I am ${value}.`);
    expect(deanonymizedMessage.content).toBe(`Hi, I am ${value}.`);

    // Original mask must be gone
    expect(deanonymizedChunk.content).not.toContain(mask);
    expect(deanonymizedMessage.content).not.toContain(mask);

    // deanonymized_output mask should also be gone
    const outputMsg = deanonymizedChunk.deanonymized_output?.message as AssistantMessage;
    expect(outputMsg.content).toBe(`Hi, I am ${value}.`);
    expect(outputMsg.content).not.toContain(mask);

    // The deanonymized_input should include the original user message restored
    expect((deanonymizedMessage.deanonymized_input?.[0].message as UserMessage).content).toBe(
      `Hi, I am ${value}.`
    );
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

    const chunk: ChatCompletionChunkEvent = chunkEvent(
      `Reply concerning ${mask1} and ${mask2} and ${mask3}`
    );

    const msg = messageEvent(`Reply concerning ${mask1} and ${mask2} and ${mask3}`);

    const [chunkOut, msgOut] = await lastValueFrom(
      from([chunk, msg]).pipe(deanonymizeMessage(anonymizationOutput), toArray())
    );

    // Expect deanonymized_input to have three entries with correct mappings
    expect(chunkOut.deanonymized_input).toHaveLength(3);

    const [firstInputItem, secondInputItem, thirdInputItem] = chunkOut.deanonymized_input!;

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

    // Verify deanonymized output (chunk content)
    expect(chunkOut.content).toBe(`Reply concerning ${val1} and ${val2} and ${val3}`);

    // Deanonymized output should include all three deanonymizations on both events
    const expectedEntities = [mask1, mask2, mask3];

    const chunkEntities = chunkOut.deanonymized_output?.deanonymizations.map((d) => d.entity.mask);
    expect(chunkEntities).toEqual(expect.arrayContaining(expectedEntities));

    expect(msgOut.deanonymized_output?.deanonymizations.map((d) => d.entity.mask)).toEqual(
      expect.arrayContaining(expectedEntities)
    );
  });

  it('deanonymizes WEBSITE masks produced by anonymizeMessages', async () => {
    const websiteRule: AnonymizationRule = {
      type: 'RegExp',
      enabled: true,
      entityClass: 'WEBSITE',
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
    const [maskedChunkEvent, maskedMessageEvent] = [
      chunkEvent(maskedUserContent),
      messageEvent(maskedUserContent),
    ];

    const [deanonymizedChunkEvent, deanonymizedMessageEvent] = await lastValueFrom(
      from([maskedChunkEvent, maskedMessageEvent]).pipe(
        deanonymizeMessage({ messages: maskedMsgs, anonymizations }),
        toArray()
      )
    );

    expect(deanonymizedChunkEvent.content).toBe(originalContent);
    expect(deanonymizedMessageEvent.content).toBe(originalContent);

    // Calculate exact positions in original content for each entity
    const urlStart = originalContent.indexOf('sub.domain.co.uk');
    const urlEnd = urlStart + 'sub.domain.co.uk'.length;

    const expectedDeanonymizations = [
      {
        start: urlStart,
        end: urlEnd,
        entity: anonymizations.find((a) => a.entity.class_name === 'WEBSITE')!.entity,
      },
    ];

    expect(deanonymizedMessageEvent.deanonymized_output?.deanonymizations).toEqual(
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

    const [chunkOut, msgOut] = await lastValueFrom(
      from([chunk, msg]).pipe(deanonymizeMessage(anonymizationOutput), toArray())
    );

    const expectedContent = `${name} is from ${city}`;
    expect(chunkOut.content).toBe(expectedContent);
    expect(msgOut.content).toBe(expectedContent);

    // Offsets
    const nameStart = 0;
    const nameEnd = name.length;
    const cityStart = expectedContent.indexOf(city);
    const cityEnd = cityStart + city.length;

    const deanonymizations = msgOut.deanonymized_output!.deanonymizations;
    expect(deanonymizations).toEqual(
      expect.arrayContaining([
        { start: nameStart, end: nameEnd, entity: anonymizations[0].entity },
        { start: cityStart, end: cityEnd, entity: anonymizations[1].entity },
      ])
    );
  });
});
