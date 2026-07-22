/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  executePiiRestore,
  piiRestoreStepDefinition,
  piiRestoreStepHandler,
} from './pii_restore_step';

describe('piiRestoreStepDefinition', () => {
  it('wires the tested restoration handler into the step definition', () => {
    expect(piiRestoreStepDefinition.handler).toBe(piiRestoreStepHandler);
  });

  it('restores protected values in final response content', () => {
    expect(
      executePiiRestore({
        rawContent: 'Contact EMAIL_TOKEN',
        tokenMap: {
          EMAIL_TOKEN: { original: 'person@example.com', entityClass: 'EMAIL' },
        },
      })
    ).toEqual({ content: 'Contact person@example.com' });
  });
});
