/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAgentExecutionError } from '@kbn/agent-builder-common/base/errors';
import { AgentExecutionErrorCode } from '@kbn/agent-builder-common/agents';
import {
  AgentActionType,
  contextLengthErrorAction,
  substitutionAction,
  isContextLengthErrorAction,
  isSubstitutionAction,
  isAgentErrorAction,
} from './actions';

describe('context management actions', () => {
  it('creates a substitution action carrying the step data', () => {
    const action = substitutionAction({
      substituted_tool_call_ids: ['a'],
      trigger: 'intra_round',
      reason: 'input_tokens_threshold',
    });
    expect(action.type).toBe(AgentActionType.Substitution);
    expect(isSubstitutionAction(action)).toBe(true);
    expect(action.substituted_tool_call_ids).toEqual(['a']);
  });

  it('context-length error actions are not agent error actions', () => {
    const error = createAgentExecutionError(
      'too long',
      AgentExecutionErrorCode.contextLengthExceeded,
      {}
    );
    const action = contextLengthErrorAction(error);
    expect(isContextLengthErrorAction(action)).toBe(true);
    expect(isAgentErrorAction(action)).toBe(false);
  });
});
