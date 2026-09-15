/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentBuilderErrorCode } from '@kbn/agent-builder-common';
import { CONVERSATION_BULK_GET_MAX_IDS } from '../../../../common/constants';
import { compileConversationIds } from './compile_ids';

describe('compileConversationIds', () => {
  it('compiles ids to a single ids clause rather than a term disjunction', () => {
    expect(compileConversationIds(['conv-1', 'conv-2'])).toEqual({
      ids: { values: ['conv-1', 'conv-2'] },
    });
  });

  it('compiles an empty array to a clause matching nothing, never a missing filter', () => {
    expect(compileConversationIds([])).toEqual({ ids: { values: [] } });
  });

  it('accepts exactly the maximum number of ids', () => {
    const ids = Array.from(
      { length: CONVERSATION_BULK_GET_MAX_IDS },
      (_, index) => `conv-${index}`
    );

    expect(compileConversationIds(ids)).toEqual({ ids: { values: ids } });
  });

  it('rejects more than the maximum number of ids', () => {
    const ids = Array.from(
      { length: CONVERSATION_BULK_GET_MAX_IDS + 1 },
      (_, index) => `conv-${index}`
    );

    expect(() => compileConversationIds(ids)).toThrow(
      expect.objectContaining({
        code: AgentBuilderErrorCode.badRequest,
        message: expect.stringContaining(`at most ${CONVERSATION_BULK_GET_MAX_IDS}`),
      })
    );
  });
});
