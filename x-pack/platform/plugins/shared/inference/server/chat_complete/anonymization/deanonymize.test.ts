/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deanonymize } from './deanonymize';
import type { Anonymization, AssistantMessage, Message, UserMessage } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import { createMask } from '../../test_utils';

describe('deanonymize', () => {
  describe('email mask', () => {
    const value = 'jorge@gmail.com';
    const mask = createMask('EMAIL', value);

    const anonymization: Anonymization = {
      entity: {
        class_name: 'EMAIL',
        value,
        mask,
      },
      rule: {
        type: 'RegExp',
      },
    };

    it('restores plain user message content and returns correct positions', () => {
      const message: UserMessage = {
        role: MessageRole.User,
        content: `My email is ${mask}.`,
      };

      const { message: deanonymized, deanonymizations } = deanonymize(message, [anonymization]);

      expect((deanonymized as UserMessage).content).toBe(`My email is ${value}.`);

      const startIndex = `My email is `.length;
      expect(deanonymizations).toEqual([
        {
          start: startIndex,
          end: startIndex + value.length,
          entity: anonymization.entity,
        },
      ]);
    });

    it('restores assistant message tool call arguments as well as content', () => {
      const toolMask = mask;
      const assistantMsg: AssistantMessage = {
        role: MessageRole.Assistant,
        content: `Your email is ${toolMask}`,
        toolCalls: [
          {
            function: {
              name: 'sendEmail',
              arguments: { to: toolMask },
            },
            toolCallId: '1',
          },
        ],
      };

      const { message: deanonymized } = deanonymize(assistantMsg, [anonymization]);

      expect(deanonymized.content).toContain(value);
      const args = (
        deanonymized as AssistantMessage & {
          toolCalls: [{ function: { arguments: { to: string } } }];
        }
      ).toolCalls?.[0].function.arguments;
      expect(args.to).toBe(value);
    });
  });

  describe('multiple entities offset regression', () => {
    it('keeps second entity indices correct after first replacement', () => {
      const name = 'Jorge';
      const city = 'Mission Viejo';

      const nameMask = createMask('PER', name);
      const cityMask = createMask('LOC', city);

      const anonymizations: Anonymization[] = [
        { entity: { class_name: 'PER', value: name, mask: nameMask }, rule: { type: 'NER' } },
        { entity: { class_name: 'LOC', value: city, mask: cityMask }, rule: { type: 'NER' } },
      ];

      const originalMsg: UserMessage = {
        role: MessageRole.User,
        content: `${nameMask} is from ${cityMask}`,
      };

      const { message: deanonymized, deanonymizations } = deanonymize(originalMsg, anonymizations);

      // content restored
      const expectedContent = `${name} is from ${city}`;
      expect(deanonymized.content).toBe(expectedContent);

      // offsets must point to correct substrings
      const nameStart = 0;
      const nameEnd = name.length;
      const cityStart = expectedContent.indexOf(city);
      const cityEnd = cityStart + city.length;

      expect(deanonymizations).toEqual(
        expect.arrayContaining([
          { start: nameStart, end: nameEnd, entity: anonymizations[0].entity },
          { start: cityStart, end: cityEnd, entity: anonymizations[1].entity },
        ])
      );
    });

    it('ensures deanonymization start/end are correct in the final string when regex is processed before earlier NER', () => {
      const name = 'john';
      const email = 'john123@gmail.com';

      // Reflect realistic mask lengths and rule execution order: RegExp before NER.
      const nameMask = `PER_${'a'.repeat(40)}`;
      const emailMask = `EMAIL_${'b'.repeat(40)}`;

      const anonymizations: Anonymization[] = [
        {
          entity: { class_name: 'EMAIL', value: email, mask: emailMask },
          rule: { type: 'RegExp' },
        },
        { entity: { class_name: 'PER', value: name, mask: nameMask }, rule: { type: 'NER' } },
      ];

      const originalMsg: UserMessage = {
        role: MessageRole.User,
        content: `my name is ${nameMask} and my email is ${emailMask}`,
      };

      const { message: deanonymized, deanonymizations } = deanonymize(originalMsg, anonymizations);

      const expectedContent = `my name is ${name} and my email is ${email}`;
      expect(deanonymized.content).toBe(expectedContent);

      for (const deanonymization of deanonymizations) {
        expect(deanonymization.start).toBeGreaterThanOrEqual(0);
        expect(deanonymization.end).toBeLessThanOrEqual(expectedContent.length);
        expect(expectedContent.slice(deanonymization.start, deanonymization.end)).toBe(
          deanonymization.entity.value
        );
      }
    });

    it('deanonymizes repeated occurrences of the same mask and reports all ranges', () => {
      const name = 'john';
      const nameMask = createMask('PER', name);
      const anonymizations: Anonymization[] = [
        { entity: { class_name: 'PER', value: name, mask: nameMask }, rule: { type: 'NER' } },
      ];

      const originalMsg: UserMessage = {
        role: MessageRole.User,
        content: `${nameMask} met ${nameMask} and ${nameMask}`,
      };

      const { message: deanonymized, deanonymizations } = deanonymize(originalMsg, anonymizations);
      const expectedContent = `${name} met ${name} and ${name}`;
      expect(deanonymized.content).toBe(expectedContent);
      expect(deanonymizations).toHaveLength(3);

      for (const deanonymization of deanonymizations) {
        expect(expectedContent.slice(deanonymization.start, deanonymization.end)).toBe(name);
      }
    });

    // Defensive coverage: resolveOverlapsAndMask should prevent this.
    it('prefers longer mask when two masks match at same start position', () => {
      const shortMask = 'ENTITY_abc';
      const longMask = 'ENTITY_abc123';
      const shortValue = 'SHORT';
      const longValue = 'LONG_VALUE';

      const anonymizations: Anonymization[] = [
        {
          entity: { class_name: 'GENERIC', value: shortValue, mask: shortMask },
          rule: { type: 'RegExp' },
        },
        {
          entity: { class_name: 'GENERIC', value: longValue, mask: longMask },
          rule: { type: 'RegExp' },
        },
      ];

      const originalMsg: UserMessage = {
        role: MessageRole.User,
        content: `A ${longMask} B ${shortMask}`,
      };

      const { message: deanonymized, deanonymizations } = deanonymize(originalMsg, anonymizations);
      const expectedContent = `A ${longValue} B ${shortValue}`;
      expect(deanonymized.content).toBe(expectedContent);

      expect(deanonymizations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ entity: anonymizations[1].entity }),
          expect.objectContaining({ entity: anonymizations[0].entity }),
        ])
      );
      for (const deanonymization of deanonymizations) {
        expect(expectedContent.slice(deanonymization.start, deanonymization.end)).toBe(
          deanonymization.entity.value
        );
      }
    });

    it('deanonymizes both content and tool call arguments without corrupting content ranges', () => {
      const name = 'john';
      const email = 'john123@gmail.com';
      const nameMask = `PER_${'a'.repeat(40)}`;
      const emailMask = `EMAIL_${'b'.repeat(40)}`;

      const anonymizations: Anonymization[] = [
        {
          entity: { class_name: 'EMAIL', value: email, mask: emailMask },
          rule: { type: 'RegExp' },
        },
        { entity: { class_name: 'PER', value: name, mask: nameMask }, rule: { type: 'NER' } },
      ];

      const assistantMsg: AssistantMessage = {
        role: MessageRole.Assistant,
        content: `my name is ${nameMask} and my email is ${emailMask}`,
        toolCalls: [
          {
            function: {
              name: 'saveProfile',
              arguments: { user: nameMask, contact: emailMask },
            },
            toolCallId: '1',
          },
        ],
      };

      const { message: deanonymized, deanonymizations } = deanonymize(assistantMsg, anonymizations);
      const expectedContent = `my name is ${name} and my email is ${email}`;
      expect(deanonymized.content).toBe(expectedContent);

      const args = (
        deanonymized as AssistantMessage & {
          toolCalls: [{ function: { arguments: { user: string; contact: string } } }];
        }
      ).toolCalls?.[0].function.arguments;

      expect(args.user).toBe(name);
      expect(args.contact).toBe(email);

      const contentRanges = deanonymizations.filter(
        (deanonymization) =>
          deanonymization.start >= 0 &&
          deanonymization.end <= expectedContent.length &&
          expectedContent.slice(deanonymization.start, deanonymization.end) ===
            deanonymization.entity.value
      );

      expect(contentRanges).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ entity: anonymizations[0].entity }),
          expect.objectContaining({ entity: anonymizations[1].entity }),
        ])
      );
    });
  });

  it('handles no anonymizations gracefully (returns identical message)', () => {
    const msg: Message = { role: MessageRole.User, content: 'Nothing to change' } as any;
    const { message: result, deanonymizations } = deanonymize(msg, []);
    expect(result).toStrictEqual(msg);
    expect(deanonymizations.length).toBe(0);
  });
});
