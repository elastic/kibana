/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AiIndexActions } from './ai_index';

describe('#read', () => {
  it('returns a namespaced read action for the KI type', () => {
    const actions = new AiIndexActions();
    expect(actions.read('dashboard')).toBe('ai_index:dashboard/read');
  });

  [null, undefined, ''].forEach((kiType) => {
    it(`throws when kiType is ${JSON.stringify(kiType)}`, () => {
      const actions = new AiIndexActions();
      expect(() => actions.read(kiType as unknown as string)).toThrowErrorMatchingInlineSnapshot(
        `"kiType is required and must be a string"`
      );
    });
  });
});
