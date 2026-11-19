/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CONVERSATION_STARTER_LABEL_MAX_LENGTH,
  CONVERSATION_STARTER_PROMPT_MAX_LENGTH,
  MAX_CONVERSATION_STARTERS,
} from '@kbn/agent-builder-common';
import { conversationStartersSchema } from './conversation_starters_schema';

describe('conversationStartersSchema', () => {
  const startersSchema = conversationStartersSchema({ description: 'Starters.' });

  it('accepts a label on its own', () => {
    expect(startersSchema.validate([{ label: 'first' }])).toEqual([{ label: 'first' }]);
  });

  it('accepts a label with a prompt', () => {
    const starters = [{ label: 'Top errors', prompt: 'Show me the top 10 errors this week' }];

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
    expect(() => startersSchema.validate([{ prompt: 'only a prompt' }])).toThrow();
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

  describe('prompt', () => {
    it('accepts a prompt of the maximum length', () => {
      const starters = [
        { label: 'first', prompt: 'a'.repeat(CONVERSATION_STARTER_PROMPT_MAX_LENGTH) },
      ];

      expect(startersSchema.validate(starters)).toEqual(starters);
    });

    it('rejects a prompt longer than the maximum length', () => {
      expect(() =>
        startersSchema.validate([
          { label: 'first', prompt: 'a'.repeat(CONVERSATION_STARTER_PROMPT_MAX_LENGTH + 1) },
        ])
      ).toThrow(`maximum length of [${CONVERSATION_STARTER_PROMPT_MAX_LENGTH}]`);
    });

    it('rejects a prompt made only of whitespace', () => {
      expect(() => startersSchema.validate([{ label: 'first', prompt: '   ' }])).toThrow(
        'Conversation starter text must not be blank.'
      );
    });
  });
});
