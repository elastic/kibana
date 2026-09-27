/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Anonymization } from '@kbn/inference-common';
import { DeanonymizeStreamBuffer } from './deanonymize_stream_buffer';
import { createMask } from '../../test_utils';

describe('DeanonymizeStreamBuffer', () => {
  it('emits plain text immediately when there is nothing token-like at the tail', () => {
    const buffer = new DeanonymizeStreamBuffer([]);
    expect(buffer.push('Hello, how can I help?')).toBe('Hello, how can I help?');
    expect(buffer.emittedLength).toBe('Hello, how can I help?'.length);
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
    expect(buffer.emittedLength).toBe(emitted.length);
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
    expect(buffer.emittedLength).toBe(0);
  });

  it('returns an empty delta and does not advance emittedLength for empty input', () => {
    const buffer = new DeanonymizeStreamBuffer([]);
    expect(buffer.push('')).toBe('');
    expect(buffer.emittedLength).toBe(0);
  });
});
