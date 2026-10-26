/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExistingWorkflowActionDraft, InlineWorkflowActionDraft } from '../types';
import { isActionValid, validateInlineAction } from './validate_inline_action';

const inline = (overrides: Partial<InlineWorkflowActionDraft> = {}): InlineWorkflowActionDraft => ({
  id: 'a1',
  source: 'inline',
  stepType: 'email',
  connectorId: 'email-1',
  params: 'to:\n  - "user@example.com"\nsubject: "Hi"\nmessage: "Body"\n',
  ...overrides,
});

const slack = (overrides: Partial<InlineWorkflowActionDraft> = {}): InlineWorkflowActionDraft =>
  inline({
    stepType: 'slack2.sendMessage',
    connectorId: 'slack-1',
    params: 'channel: "C123"\ntext: "Hello"\n',
    ...overrides,
  });

const existing = (
  overrides: Partial<ExistingWorkflowActionDraft> = {}
): ExistingWorkflowActionDraft => ({
  id: 'w1',
  source: 'existing',
  workflowId: 'workflow-1',
  ...overrides,
});

describe('isActionValid', () => {
  it.each([
    ['an existing workflow is selected', existing(), true],
    ['no existing workflow is selected', existing({ workflowId: null }), false],
    ['a complete email draft', inline(), true],
    ['a complete slack draft', slack(), true],
    ['an inline draft has no connector', inline({ connectorId: null }), false],
    [
      'an email draft has an unfilled field',
      inline({ params: 'to:\n  - ""\nsubject: ""\n' }),
      false,
    ],
    ['a slack draft misses a mandatory field', slack({ params: 'channel: C123\n' }), false],
    [
      'inline params have an unknown field',
      slack({ params: 'channel: C1\ntext: T\nx: y\n' }),
      false,
    ],
    ['inline params are malformed YAML', inline({ params: 'to: "unterminated\n' }), false],
    [
      'inline values reference dispatcher payload templating',
      inline({
        params: 'to:\n  - ops@example.com\nsubject: A\nmessage: "{{ inputs.episodes }}"\n',
      }),
      true,
    ],
  ])('for %s returns %s', (_, action, expected) => {
    expect(isActionValid(action)).toBe(expected);
  });
});

describe('validateInlineAction', () => {
  it('returns no errors for a complete draft', () => {
    expect(validateInlineAction(inline())).toEqual({ connector: undefined, params: [] });
  });

  it('reports a missing connector', () => {
    expect(validateInlineAction(inline({ connectorId: null })).connector).toBe(
      'Select a connector.'
    );
  });

  it('validates the params against the schema of the draft step type', () => {
    expect(
      validateInlineAction(slack({ params: 'channel: C123\nthreadTs: "1"\n' })).params
    ).toEqual(["'text' is required.", "Unknown field: 'threadTs'."]);
  });
});
