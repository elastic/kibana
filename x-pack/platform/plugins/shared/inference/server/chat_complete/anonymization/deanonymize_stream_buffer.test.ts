/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Anonymization } from '@kbn/inference-common';
import { indexEntitiesByMask, replaceMasks } from './deanonymize';
import { DeanonymizeStreamBuffer } from './deanonymize_stream_buffer';
import { createMask } from '../../test_utils';

describe('DeanonymizeStreamBuffer', () => {
  it('emits plain text immediately when there is nothing token-like at the tail', () => {
    const buffer = new DeanonymizeStreamBuffer([]);
    expect(buffer.push('Hello, how can I help?')).toBe('Hello, how can I help?');
    expect(buffer.catchUp('Hello, how can I help?')).toEqual({ content: '', diverged: false });
  });

  it('holds back a mask split into small multi-character fragments and emits the restored value once complete', () => {
    const value = 'jorge@gmail.com';
    const mask = createMask('EMAIL', value);
    const anonymizations: Anonymization[] = [
      { entity: { class_name: 'EMAIL', value, mask }, rule: { type: 'RegExp' } },
    ];

    const buffer = new DeanonymizeStreamBuffer(anonymizations);
    let emitted = '';

    // Realistic tokenizer-sized fragments, split at arbitrary mid-mask boundaries
    // (including ones that leave only a single dangling character, e.g. after "is ").
    const fragments = [
      'Your email is ',
      mask.slice(0, 1),
      mask.slice(1, 9),
      mask.slice(9, 20),
      mask.slice(20),
      '.',
    ];
    for (const fragment of fragments) {
      emitted += buffer.push(fragment);
    }

    expect(emitted).toBe(`Your email is ${value}.`);
    expect(emitted).not.toContain(mask);
    expect(buffer.catchUp(emitted)).toEqual({ content: '', diverged: false });
  });

  it('resolves a mask correctly even when it streams in completely alone, one character at a time', () => {
    // This is the regression case for the original MIN_HOLDBACK_LENGTH = 2 design: if
    // a mask's very first character is ever flushed in isolation, alignment with the
    // mask's start is permanently lost and it leaks through unresolved for the rest of
    // the stream. MIN_HOLDBACK_LENGTH = 1 fixes this by always holding a lone leading
    // character that matches a known mask's first character.
    const value = 'jorge@gmail.com';
    const mask = createMask('EMAIL', value);
    const anonymizations: Anonymization[] = [
      { entity: { class_name: 'EMAIL', value, mask }, rule: { type: 'RegExp' } },
    ];

    const buffer = new DeanonymizeStreamBuffer(anonymizations);
    let emitted = '';
    for (const char of mask) {
      emitted += buffer.push(char);
    }

    expect(emitted).toBe(value);
  });

  it('holds back a mask split across a handful of larger chunks', () => {
    const value = 'jorge';
    const mask = createMask('PER', value);
    const anonymizations: Anonymization[] = [
      { entity: { class_name: 'PER', value, mask }, rule: { type: 'NER' } },
    ];

    const full = `Hi ${mask}, welcome!`;
    // Split into small chunks, some of which land mid-mask.
    const chunks = [full.slice(0, 5), full.slice(5, 9), full.slice(9, 14), full.slice(14)];

    const buffer = new DeanonymizeStreamBuffer(anonymizations);
    const emitted = chunks.map((chunk) => buffer.push(chunk)).join('');

    expect(emitted).toBe(`Hi ${value}, welcome!`);
  });

  it('restores multiple distinct masks arriving across different chunks', () => {
    const name = 'Bob';
    const city = 'Paris';
    const nameMask = createMask('PER', name);
    const cityMask = createMask('LOC', city);

    const anonymizations: Anonymization[] = [
      { entity: { class_name: 'PER', value: name, mask: nameMask }, rule: { type: 'NER' } },
      { entity: { class_name: 'LOC', value: city, mask: cityMask }, rule: { type: 'NER' } },
    ];

    const buffer = new DeanonymizeStreamBuffer(anonymizations);
    const chunk1 = `${nameMask} is fro`;
    const chunk2 = `m ${cityMask}.`;

    const emitted = buffer.push(chunk1) + buffer.push(chunk2);

    expect(emitted).toBe(`${name} is from ${city}.`);
  });

  it('never permanently holds back ordinary capitalized text that is not a prefix of any real mask for this call', () => {
    const value = 'jorge@gmail.com';
    const mask = createMask('EMAIL', value);
    const anonymizations: Anonymization[] = [
      { entity: { class_name: 'EMAIL', value, mask }, rule: { type: 'RegExp' } },
    ];
    const buffer = new DeanonymizeStreamBuffer(anonymizations);

    // "NOTICE" is all-caps and ends in "E" — the same letter the known EMAIL_... mask
    // starts with — so that trailing "E" is held for exactly one chunk on the (false)
    // chance it is the start of a mask. It is not a prefix of any real mask issued for
    // this call (the model can only ever echo back masks it was actually given), so it
    // is released, unmodified, as soon as the next chunk arrives and fails to extend
    // the match — costing one chunk of latency, never lost or corrupted content.
    const firstDelta = buffer.push('This is an IMPORTANT NOTICE');
    expect(firstDelta).toBe('This is an IMPORTANT NOTIC');

    const secondDelta = buffer.push(' to all staff.');
    expect(secondDelta).toBe('E to all staff.');
  });

  it('holds back a single leading mask character rather than emitting it immediately', () => {
    const value = 'jorge@gmail.com';
    const mask = createMask('EMAIL', value);
    const anonymizations: Anonymization[] = [
      { entity: { class_name: 'EMAIL', value, mask }, rule: { type: 'RegExp' } },
    ];
    const buffer = new DeanonymizeStreamBuffer(anonymizations);

    // The mask's very first character ("E") must be held, even alone, so that
    // alignment with the mask's start is never lost if the rest of the mask arrives
    // in a later chunk.
    const firstDelta = buffer.push(`Reach out ${mask[0]}`);
    expect(firstDelta).toBe('Reach out ');

    const secondDelta = buffer.push(mask.slice(1));
    expect(firstDelta + secondDelta).toBe(`Reach out ${value}`);
  });

  it('bounds the held tail to at most one character short of the longest known mask, no artificial cap needed', () => {
    const value = 'jorge@gmail.com';
    const mask = createMask('EMAIL', value);
    const anonymizations: Anonymization[] = [
      { entity: { class_name: 'EMAIL', value, mask }, rule: { type: 'RegExp' } },
    ];
    const buffer = new DeanonymizeStreamBuffer(anonymizations);

    // Push everything except the mask's final character: a genuine, maximal partial
    // match, which must be held in full — but never more than that.
    const delta = buffer.push(mask.slice(0, -1));
    expect(delta).toBe('');
    expect(buffer.catchUp(value)).toEqual({ content: value, diverged: false });
  });

  it('holds only the longest tail that is a real mask prefix when an earlier character also matches a mask start', () => {
    const value = 'jorge@gmail.com';
    const mask = createMask('EMAIL', value);
    const anonymizations: Anonymization[] = [
      { entity: { class_name: 'EMAIL', value, mask }, rule: { type: 'RegExp' } },
    ];
    const buffer = new DeanonymizeStreamBuffer(anonymizations);

    // The first "E" is not the start of a mask (it is followed by another "E"), so only
    // the trailing "EMAI" may be held back; the leading "E" must be emitted.
    const partialMask = mask.slice(0, 4);
    const firstDelta = buffer.push(`E${partialMask}`);
    expect(firstDelta).toBe('E');

    const secondDelta = buffer.push(mask.slice(4));
    expect(firstDelta + secondDelta).toBe(`E${value}`);
  });

  it('emits text without any mask-start character untouched, tracks what was emitted, and still restores masks in later chunks', () => {
    const value = 'jorge@gmail.com';
    const mask = createMask('EMAIL', value);
    const anonymizations: Anonymization[] = [
      { entity: { class_name: 'EMAIL', value, mask }, rule: { type: 'RegExp' } },
    ];
    const buffer = new DeanonymizeStreamBuffer(anonymizations);

    const plain = '123 - ok, done. ';
    expect(buffer.push(plain)).toBe(plain);
    expect(buffer.catchUp(plain)).toEqual({ content: '', diverged: false });

    const restored = buffer.push(`${mask}!`);
    expect(restored).toBe(`${value}!`);
    expect(buffer.catchUp(`${plain}${value}!`)).toEqual({ content: '', diverged: false });
  });

  it('does not duplicate a replacement when several anonymization entries share the same mask', () => {
    const value = 'jorge@gmail.com';
    const mask = createMask('EMAIL', value);
    const entity = { class_name: 'EMAIL', value, mask };
    const anonymizations: Anonymization[] = [
      { entity, rule: { type: 'RegExp' } },
      { entity, rule: { type: 'NER' } },
    ];
    const buffer = new DeanonymizeStreamBuffer(anonymizations);

    expect(buffer.push(`Contact ${mask} today.`)).toBe(`Contact ${value} today.`);
  });

  it('returns an empty delta and emits nothing for empty input', () => {
    const buffer = new DeanonymizeStreamBuffer([]);
    expect(buffer.push('')).toBe('');
    expect(buffer.catchUp('')).toEqual({ content: '', diverged: false });
  });

  describe('catchUp', () => {
    it('returns the held tail that was never released', () => {
      const value = 'jorge@gmail.com';
      const mask = createMask('EMAIL', value);
      const buffer = new DeanonymizeStreamBuffer([
        { entity: { class_name: 'EMAIL', value, mask }, rule: { type: 'RegExp' } },
      ]);

      const emitted = buffer.push('Hi, ends with E');

      expect(emitted).toBe('Hi, ends with ');
      expect(buffer.catchUp('Hi, ends with E')).toEqual({ content: 'E', diverged: false });
    });

    it('reports divergence and returns the text after the common prefix when the streamed text is not a prefix of the final text', () => {
      const buffer = new DeanonymizeStreamBuffer([]);
      buffer.push('Hello there');

      expect(buffer.catchUp('Hello world, how are you')).toEqual({
        content: 'world, how are you',
        diverged: true,
      });
    });
  });

  describe('equivalence with full-text deanonymization', () => {
    const emailValue = 'jorge@gmail.com';
    const personValue = 'Bob';
    const cityValue = 'Paris';
    const emailMask = createMask('EMAIL', emailValue);
    const personMask = createMask('PER', personValue);
    const cityMask = createMask('LOC', cityValue);
    const anonymizations: Anonymization[] = [
      {
        entity: { class_name: 'EMAIL', value: emailValue, mask: emailMask },
        rule: { type: 'RegExp' },
      },
      {
        entity: { class_name: 'PER', value: personValue, mask: personMask },
        rule: { type: 'NER' },
      },
      { entity: { class_name: 'LOC', value: cityValue, mask: cityMask }, rule: { type: 'NER' } },
    ];
    const entitiesByMask = indexEntitiesByMask(anonymizations);

    const texts = [
      'No masks here, just text.',
      `Write to ${emailMask}.`,
      `${personMask} lives in ${cityMask} and writes from ${emailMask}`,
      `${personMask}${cityMask}${emailMask}`,
      `EMAIL PER LOC are not masks, but ${emailMask} is, and so is ${personMask}. E P L`,
      `Ends on a partial lookalike: ${emailMask.slice(0, 7)}`,
    ];

    const streamThenCatchUp = (chunks: string[], fullText: string): string => {
      const buffer = new DeanonymizeStreamBuffer(anonymizations);
      const streamed = chunks.map((chunk) => buffer.push(chunk)).join('');
      const { content, diverged } = buffer.catchUp(fullText);
      expect(diverged).toBe(false);
      return streamed + content;
    };

    for (const text of texts) {
      it(`matches full-text output for every two-way split of ${JSON.stringify(text)}`, () => {
        const { output: expected } = replaceMasks(text, entitiesByMask);

        for (let split = 0; split <= text.length; split += 1) {
          expect(streamThenCatchUp([text.slice(0, split), text.slice(split)], expected)).toBe(
            expected
          );
        }
      });
    }

    for (const text of texts) {
      it(`matches full-text output when streamed one character at a time: ${JSON.stringify(
        text
      )}`, () => {
        const { output: expected } = replaceMasks(text, entitiesByMask);

        expect(streamThenCatchUp([...text], expected)).toBe(expected);
      });
    }

    for (const text of texts) {
      it(`matches full-text output for pseudo-random multi-way splits of ${JSON.stringify(
        text
      )}`, () => {
        const { output: expected } = replaceMasks(text, entitiesByMask);

        // Deterministic LCG so any failure is reproducible.
        let seed = 42;
        const nextInt = (max: number) => {
          seed = (seed * 1664525 + 1013904223) % 4294967296;
          return seed % max;
        };

        for (let run = 0; run < 50; run += 1) {
          const chunks: string[] = [];
          let cursor = 0;
          while (cursor < text.length) {
            const size = 1 + nextInt(12);
            chunks.push(text.slice(cursor, cursor + size));
            cursor += size;
          }
          expect(streamThenCatchUp(chunks, expected)).toBe(expected);
        }
      });
    }
  });
});
