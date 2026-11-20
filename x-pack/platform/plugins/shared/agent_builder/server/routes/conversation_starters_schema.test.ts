/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CONVERSATION_STARTER_LABEL_MAX_LENGTH,
  MAX_CONVERSATION_STARTERS,
} from '@kbn/agent-builder-common';
import { conversationStartersSchema } from './conversation_starters_schema';

describe('conversationStartersSchema', () => {
  const startersSchema = conversationStartersSchema({ description: 'Starters.' });

  it('accepts a list of starters', () => {
    const starters = [{ label: 'first' }, { label: 'second' }];

    expect(startersSchema.validate(starters)).toEqual(starters);
  });

  it('accepts an empty list', () => {
    expect(startersSchema.validate([])).toEqual([]);
  });

  it('accepts the maximum number of starters', () => {
    const starters = Array.from({ length: MAX_CONVERSATION_STARTERS }, (_, i) => ({
      label: `s${i}`,
    }));

    expect(startersSchema.validate(starters)).toEqual(starters);
  });

  it('rejects more than the maximum number of starters', () => {
    const starters = Array.from({ length: MAX_CONVERSATION_STARTERS + 1 }, (_, i) => ({
      label: `s${i}`,
    }));

    expect(() => startersSchema.validate(starters)).toThrow(
      `cannot be greater than [${MAX_CONVERSATION_STARTERS}]`
    );
  });

  it('rejects a plain string instead of an object', () => {
    expect(() => startersSchema.validate(['first'])).toThrow();
  });

  it('rejects a starter without a label', () => {
    expect(() => startersSchema.validate([{}])).toThrow();
  });

  it('rejects fields it does not know, such as a separate prompt', () => {
    expect(() => startersSchema.validate([{ label: 'first', prompt: 'something else' }])).toThrow();
  });

  describe('label', () => {
    it('accepts a label of the maximum length', () => {
      const starters = [{ label: 'a'.repeat(CONVERSATION_STARTER_LABEL_MAX_LENGTH) }];

      expect(startersSchema.validate(starters)).toEqual(starters);
    });

    it('rejects a label longer than the maximum length', () => {
      expect(() =>
        startersSchema.validate([{ label: 'a'.repeat(CONVERSATION_STARTER_LABEL_MAX_LENGTH + 1) }])
      ).toThrow(`maximum length of [${CONVERSATION_STARTER_LABEL_MAX_LENGTH}]`);
    });

    it('rejects an empty label', () => {
      expect(() => startersSchema.validate([{ label: '' }])).toThrow('minimum length of [1]');
    });

    it('rejects a label made only of whitespace', () => {
      expect(() => startersSchema.validate([{ label: '   ' }])).toThrow(
        'Conversation starter text must not be blank.'
      );
    });
  });
});
