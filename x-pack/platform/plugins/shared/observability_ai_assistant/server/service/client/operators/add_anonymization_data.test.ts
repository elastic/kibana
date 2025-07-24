/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of, lastValueFrom } from 'rxjs';
import { addAnonymizationData } from './add_anonymization_data';
import { Deanonymization, Message, MessageRole } from '../../../../common/types';
import {
  MessageAddEvent,
  StreamingChatResponseEventType,
} from '../../../../common/conversation_complete';

const baseTimestamp = '2025-07-06T00:00:00.000Z';

function createMessage(role: MessageRole, content: string): Message {
  return {
    '@timestamp': baseTimestamp,
    message: {
      role,
      content,
    },
  };
}

function createDeanonymization(entityValue: string): Deanonymization {
  return {
    start: 0,
    end: entityValue.length,
    entity: {
      class_name: 'test_entity',
      value: entityValue,
      mask: '[redacted]',
    },
  };
}

describe('addAnonymizationData operator', () => {
  const userMessage = createMessage(MessageRole.User, 'user content');
  const assistantMessage = createMessage(MessageRole.Assistant, 'assistant content');
  const originalMessages: Message[] = [userMessage, assistantMessage];

  it('returns original messages when the source contains no deanonymization events', async () => {
    const result = await lastValueFrom(of().pipe(addAnonymizationData(originalMessages)));

    expect(result).toEqual(originalMessages);
  });

  it('adds deanonymizations from deanonymized_input', async () => {
    const deanonymizations = [createDeanonymization('user content')];

    const event: MessageAddEvent = {
      type: StreamingChatResponseEventType.MessageAdd,
      id: '1',
      message: userMessage,
      deanonymized_input: [
        {
          message: {
            role: MessageRole.User,
            content: 'user content',
          },
          deanonymizations,
        },
      ],
    };

    const result = await lastValueFrom(of(event).pipe(addAnonymizationData(originalMessages)));

    expect(result[0].message.deanonymizations).toEqual(deanonymizations);
    expect(result[1].message.deanonymizations).toBeUndefined();
  });

  it('adds deanonymizations from deanonymized_output', async () => {
    const deanonymizations = [createDeanonymization('assistant content')];

    const event: MessageAddEvent = {
      type: StreamingChatResponseEventType.MessageAdd,
      id: '2',
      message: assistantMessage,
      deanonymized_output: {
        message: {
          role: MessageRole.Assistant,
          content: 'assistant content',
        },
        deanonymizations,
      },
    };

    const result = await lastValueFrom(of(event).pipe(addAnonymizationData(originalMessages)));

    expect(result[1].message.deanonymizations).toEqual(deanonymizations);
    expect(result[0].message.deanonymizations).toBeUndefined();
  });

  it('merges deanonymizations from multiple events and respects emission order (last event wins)', async () => {
    const deanonymizationsFirst = [createDeanonymization('first')];
    const deanonymizationsSecond = [createDeanonymization('second')];

    const firstEvent: MessageAddEvent = {
      type: StreamingChatResponseEventType.MessageAdd,
      id: '3',
      message: userMessage,
      deanonymized_input: [
        {
          message: {
            role: MessageRole.User,
            content: 'user content',
          },
          deanonymizations: deanonymizationsFirst,
        },
      ],
    };

    const secondEvent: MessageAddEvent = {
      type: StreamingChatResponseEventType.MessageAdd,
      id: '4',
      message: userMessage,
      deanonymized_input: [
        {
          message: {
            role: MessageRole.User,
            content: 'user content',
          },
          deanonymizations: deanonymizationsSecond,
        },
      ],
    };

    const result = await lastValueFrom(
      of(firstEvent, secondEvent).pipe(addAnonymizationData(originalMessages))
    );

    // secondEvent should overwrite the first event’s deanonymizations
    expect(result[0].message.deanonymizations).toEqual(deanonymizationsSecond);
  });
});
