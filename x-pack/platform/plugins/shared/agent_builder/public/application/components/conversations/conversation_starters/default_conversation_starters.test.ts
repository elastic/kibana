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
import { DEFAULT_CONVERSATION_STARTERS } from './default_conversation_starters';

describe('DEFAULT_CONVERSATION_STARTERS', () => {
  it('has at most the number of starters that are shown', () => {
    expect(DEFAULT_CONVERSATION_STARTERS.length).toBeLessThanOrEqual(MAX_CONVERSATION_STARTERS);
  });

  it('has labels that fit on a card, without repeats', () => {
    const labels = DEFAULT_CONVERSATION_STARTERS.map(({ label }) => label);

    labels.forEach((label) => {
      expect(label.trim()).not.toBe('');
      expect(label.length).toBeLessThanOrEqual(CONVERSATION_STARTER_LABEL_MAX_LENGTH);
    });
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('has a prompt for every starter', () => {
    DEFAULT_CONVERSATION_STARTERS.forEach(({ prompt }) => {
      expect(prompt?.trim()).toBeTruthy();
    });
  });
});
