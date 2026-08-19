/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExistingWorkflowActionDraft, InlineWorkflowActionDraft } from './types';
import { isActionValid } from './types';

const inline = (overrides: Partial<InlineWorkflowActionDraft> = {}): InlineWorkflowActionDraft => ({
  id: 'a1',
  source: 'inline',
  stepType: 'email',
  connectorId: 'email-1',
  params: 'to: "user@example.com"\nsubject: "Hi"\nmessage: "Body"\n',
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
        isActionValid(inline({ params: 'to: user@example.com\nsubject: Hi\nmessage: Body\n' }))
      ).toBe(true);
    });

    it('is valid when values reference dispatcher payload templating', () => {
      expect(
        isActionValid(
          inline({
            params: 'to: ops@example.com\nsubject: Alert\nmessage: "{{ inputs.episodes }}"\n',
          })
        )
      ).toBe(true);
    });

    it('is invalid for the untouched (empty) template', () => {
      expect(isActionValid(inline({ params: 'to: ""\nsubject: ""\nmessage: ""\n' }))).toBe(false);
    });

    it('is invalid when any field is left empty', () => {
      expect(
        isActionValid(inline({ params: 'to: user@example.com\nsubject: ""\nmessage: Body\n' }))
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
