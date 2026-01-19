/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  getSystemMessageFromInstructions,
  USER_INSTRUCTIONS_HEADER,
} from './get_system_message_from_instructions';

describe('getSystemMessageFromInstructions', () => {
  it('handles plain instructions', () => {
    expect(
      getSystemMessageFromInstructions({
        applicationInstructions: ['first', 'second'],
        kbUserInstructions: [],
        apiUserInstructions: [],
        availableFunctionNames: [],
      })
    ).toEqual(`first\n\nsecond`);
  });

  it('handles callbacks', () => {
    expect(
      getSystemMessageFromInstructions({
        applicationInstructions: [
          'first',
          ({ availableFunctionNames }) => {
            return availableFunctionNames[0];
          },
        ],
        kbUserInstructions: [],
        apiUserInstructions: [],
        availableFunctionNames: ['myFunction'],
      })
    ).toEqual(`first\n\nmyFunction`);
  });

  it('overrides kb instructions with adhoc instructions', () => {
    expect(
      getSystemMessageFromInstructions({
        applicationInstructions: ['first'],
        kbUserInstructions: [{ id: 'second', text: 'second from kb' }],
        apiUserInstructions: [
          {
            id: 'second',
            text: 'second from adhoc instruction',
          },
        ],
        availableFunctionNames: [],
      })
    ).toEqual(`first\n\n${USER_INSTRUCTIONS_HEADER}\n\nsecond from adhoc instruction`);
  });

  it('includes kb instructions if there is no request instruction', () => {
    expect(
      getSystemMessageFromInstructions({
        applicationInstructions: ['first'],
        kbUserInstructions: [{ id: 'second', text: 'second_kb' }],
        apiUserInstructions: [],
        availableFunctionNames: [],
      })
    ).toEqual(`first\n\n${USER_INSTRUCTIONS_HEADER}\n\nsecond_kb`);
  });

  it('handles undefined values', () => {
    expect(
      getSystemMessageFromInstructions({
        applicationInstructions: [
          'first',
          ({ availableFunctionNames }) => {
            return undefined;
          },
        ],
        kbUserInstructions: [],
        apiUserInstructions: [],
        availableFunctionNames: [],
      })
    ).toEqual(`first`);
  });
});
