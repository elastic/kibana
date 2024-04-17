/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Message } from '../schemas';
import { getMessageContentAndRole } from './helpers';

describe('helpers', () => {
  describe('getMessageContentAndRole', () => {
    const testCases: Array<[string, Pick<Message, 'content' | 'role'>]> = [
      ['Prompt 1', { content: 'Prompt 1', role: 'user' }],
      ['Prompt 2', { content: 'Prompt 2', role: 'user' }],
      ['', { content: '', role: 'user' }],
    ];

    testCases.forEach(([prompt, expectedOutput]) => {
      test(`Given the prompt "${prompt}", it returns the prompt as content with a "user" role`, () => {
        const result = getMessageContentAndRole(prompt);

        expect(result).toEqual(expectedOutput);
      });
    });
  });
});
