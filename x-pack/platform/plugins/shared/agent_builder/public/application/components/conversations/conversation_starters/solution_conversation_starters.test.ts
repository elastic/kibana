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
import {
  SOLUTION_CONVERSATION_STARTERS,
  getSolutionConversationStarters,
} from './solution_conversation_starters';

describe('SOLUTION_CONVERSATION_STARTERS', () => {
  it.each(Object.entries(SOLUTION_CONVERSATION_STARTERS))(
    'has at most the number of starters that are shown, with labels that fit, for %s',
    (_solution, starters) => {
      const labels = starters.map(({ label }) => label);

      expect(labels.length).toBeLessThanOrEqual(MAX_CONVERSATION_STARTERS);
      labels.forEach((label) => {
        expect(label.trim()).not.toBe('');
        expect(label.length).toBeLessThanOrEqual(CONVERSATION_STARTER_LABEL_MAX_LENGTH);
      });
      expect(new Set(labels).size).toBe(labels.length);
    }
  );
});

describe('getSolutionConversationStarters', () => {
  it('returns the starters of the solution', () => {
    expect(getSolutionConversationStarters('security')).toBe(
      SOLUTION_CONVERSATION_STARTERS.security
    );
  });

  it('returns no starters for a solution it does not know', () => {
    expect(getSolutionConversationStarters('unknown' as never)).toEqual([]);
  });
});
