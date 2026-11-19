/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CONVERSATION_STARTER_MAX_LENGTH,
  MAX_CONVERSATION_STARTERS,
} from '@kbn/agent-builder-common';
import { conversationStartersSchema } from './conversation_starters_schema';

describe('conversationStartersSchema', () => {
  const startersSchema = conversationStartersSchema({ description: 'Starters.' });

  it('accepts a list of starters', () => {
    expect(startersSchema.validate(['first', 'second'])).toEqual(['first', 'second']);
  });

  it('accepts an empty list', () => {
    expect(startersSchema.validate([])).toEqual([]);
  });

  it('accepts the maximum number of starters', () => {
    const starters = Array.from({ length: MAX_CONVERSATION_STARTERS }, (_, index) => `s${index}`);

    expect(startersSchema.validate(starters)).toEqual(starters);
  });

  it('rejects more than the maximum number of starters', () => {
    const starters = Array.from({ length: MAX_CONVERSATION_STARTERS + 1 }, (_, i) => `s${i}`);

    expect(() => startersSchema.validate(starters)).toThrow(
      `cannot be greater than [${MAX_CONVERSATION_STARTERS}]`
    );
  });

  it('accepts a starter of the maximum length', () => {
    const starter = 'a'.repeat(CONVERSATION_STARTER_MAX_LENGTH);

    expect(startersSchema.validate([starter])).toEqual([starter]);
  });

  it('rejects a starter longer than the maximum length', () => {
    expect(() =>
      startersSchema.validate(['a'.repeat(CONVERSATION_STARTER_MAX_LENGTH + 1)])
    ).toThrow(`maximum length of [${CONVERSATION_STARTER_MAX_LENGTH}]`);
  });

  it('rejects an empty starter', () => {
    expect(() => startersSchema.validate([''])).toThrow('minimum length of [1]');
  });

  it('rejects a starter made only of whitespace', () => {
    expect(() => startersSchema.validate(['   '])).toThrow(
      'Conversation starters must not be blank.'
    );
  });
});
