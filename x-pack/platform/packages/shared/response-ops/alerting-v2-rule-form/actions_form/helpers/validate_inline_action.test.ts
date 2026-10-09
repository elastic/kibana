/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExistingWorkflowActionDraft,
  InlineActionStepType,
  InlineWorkflowActionDraft,
} from '../types';
import { getInlineActionStepDefinition } from '../registry';
import { isActionValid, validateInlineAction } from './validate_inline_action';

const inline = (overrides: Partial<InlineWorkflowActionDraft> = {}): InlineWorkflowActionDraft => ({
  id: 'a1',
  source: 'inline',
  stepType: 'email',
  connectorId: 'email-1',
  params: 'to:\n  - user@example.com\nsubject: "Hi"\nmessage: "Body"\n',
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

const paramMessages = (draft: InlineWorkflowActionDraft) =>
  validateInlineAction(draft).params.map(({ message }) => message);

describe('isActionValid', () => {
  describe('existing workflow action', () => {
    it('is valid when a workflow is selected', () => {
      expect(isActionValid(existing())).toBe(true);
    });

    it('is invalid when no workflow is selected', () => {
      expect(isActionValid(existing({ workflowId: null }))).toBe(false);
    });
  });

  describe('inline workflow action', () => {
    it('is invalid when no connector is selected', () => {
      expect(isActionValid(inline({ connectorId: null }))).toBe(false);
    });

    it('is valid with quoted YAML values', () => {
      expect(isActionValid(inline())).toBe(true);
    });

    it('is valid with unquoted YAML values', () => {
      expect(
        isActionValid(inline({ params: 'to:\n  - user@example.com\nsubject: Hi\nmessage: Body\n' }))
      ).toBe(true);
    });

    it('is valid when values reference dispatcher payload templating', () => {
      expect(
        isActionValid(
          inline({
            params:
              'to:\n  - ops@example.com\nsubject: Alert\nmessage: "{{ inputs.payload.alerts }}"\n',
          })
        )
      ).toBe(true);
    });

    it('is invalid when `to` is a single address instead of a list', () => {
      expect(
        isActionValid(inline({ params: 'to: user@example.com\nsubject: Hi\nmessage: Body\n' }))
      ).toBe(false);
    });

    it('is invalid for the untouched (empty) template', () => {
      expect(
        isActionValid(inline({ params: getInlineActionStepDefinition('email')?.paramsTemplate }))
      ).toBe(false);
    });

    it('is invalid when any field is left empty', () => {
      expect(
        isActionValid(inline({ params: 'to:\n  - user@example.com\nsubject: ""\nmessage: Body\n' }))
      ).toBe(false);
    });

    it('is invalid for empty params', () => {
      expect(isActionValid(inline({ params: '' }))).toBe(false);
    });

    it('is invalid for malformed YAML', () => {
      expect(isActionValid(inline({ params: 'to: "unterminated\n' }))).toBe(false);
    });
  });
});

describe('validateInlineAction', () => {
  it('returns no errors for a complete draft', () => {
    expect(validateInlineAction(inline())).toEqual({ connector: undefined, params: [] });
  });

  it('reports a missing connector', () => {
    const errors = validateInlineAction(inline({ connectorId: null }));

    expect(errors.connector).toBe('Select a connector.');
    expect(errors.params).toEqual([]);
  });

  it.each([
    ['empty', ''],
    ['whitespace-only', '   \n'],
    ['comment-only', '# nothing here\n'],
  ])('reports the required fields for %s params', (_, params) => {
    expect(paramMessages(inline({ params }))).toEqual([
      'to is required.',
      'subject is required.',
      'message is required.',
    ]);
  });

  it('keys field errors by the param they belong to', () => {
    expect(
      validateInlineAction(inline({ params: 'to:\n  - user@example.com\nmessage: Body\n' })).params
    ).toEqual([{ key: 'subject', message: 'subject is required.' }]);
  });

  it.each([
    ['an unterminated quote', 'to: "unterminated\n', 'Invalid YAML on line 2, column 1: '],
    ['a duplicate key', 'subject: a\nsubject: b\n', 'Invalid YAML on line 2, column 1: '],
    ['multiple documents', 'subject: a\n---\nmessage: b\n', 'Invalid YAML on line 2, column 1: '],
  ])('reports a single keyless syntax error with its location for %s', (_, params, prefix) => {
    const { params: errors } = validateInlineAction(inline({ params }));

    expect(errors).toHaveLength(1);
    expect(errors[0].key).toBeUndefined();
    expect(errors[0].message.startsWith(prefix)).toBe(true);
    // The library's code frame and location suffix are not repeated.
    expect(errors[0].message).not.toContain('\n');
    expect(errors[0].message).not.toMatch(/at line \d+, column \d+/);
  });

  it.each([
    ['a list', '- a\n- b\n'],
    ['a scalar', 'just text'],
  ])('reports params that are %s instead of a map', (_, params) => {
    expect(validateInlineAction(inline({ params })).params).toEqual([
      { message: 'Parameters must be a YAML map of field names to values.' },
    ]);
  });

  it('reports an unknown step type', () => {
    expect(
      paramMessages(inline({ stepType: 'unknown' as InlineActionStepType, params: 'a: b\n' }))
    ).toEqual(['Unknown workflow step type: unknown.']);
  });

  it('validates Slack params with the Slack rules', () => {
    expect(
      paramMessages(
        inline({ stepType: 'slack2.sendMessage', params: 'channel: general\ntext: ""\n' })
      )
    ).toEqual(['text is required.']);
  });
});
