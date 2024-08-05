/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPromptById } from './helpers';
import { mockSystemPrompt, mockSuperheroSystemPrompt } from '../../mock/system_prompt';
import { PromptResponse } from '@kbn/elastic-assistant-common';

describe('helpers', () => {
  describe('getPromptById', () => {
    const prompts: PromptResponse[] = [mockSystemPrompt, mockSuperheroSystemPrompt];

    it('returns the correct prompt by id', () => {
      const result = getPromptById({ prompts, id: mockSuperheroSystemPrompt.id });

      expect(result).toEqual(prompts[1]);
    });

    it('returns undefined if the prompt is not found', () => {
      const result = getPromptById({ prompts, id: 'does-not-exist' });

      expect(result).toBeUndefined();
    });
  });
});
