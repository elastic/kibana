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
  workflowName: 'Email notification',
  steps: [
    {
      id: 'step-1',
      stepType: 'email',
      stepName: 'notify',
      connectorId: 'email-1',
      params: 'to: "user@example.com"\nsubject: "Hi"\nmessage: "Body"\n',
    },
  ],
  ...overrides,
});

const withStepOverrides = (
  stepOverrides: Partial<InlineWorkflowActionDraft['steps'][number]>
): InlineWorkflowActionDraft =>
  inline({
    steps: [
      {
        id: 'step-1',
        stepType: 'email',
        stepName: 'notify',
        connectorId: 'email-1',
        params: 'to: "user@example.com"\nsubject: "Hi"\nmessage: "Body"\n',
        ...stepOverrides,
      },
    ],
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
    it('is invalid when workflow name is empty', () => {
      expect(isActionValid(inline({ workflowName: '   ' }))).toBe(false);
    });

    it('is invalid when step name is empty', () => {
      expect(isActionValid(withStepOverrides({ stepName: '   ' }))).toBe(false);
    });

    it('is invalid when no connector is selected', () => {
      expect(isActionValid(withStepOverrides({ connectorId: null }))).toBe(false);
    });

    it('is invalid when there are no steps', () => {
      expect(isActionValid(inline({ steps: [] }))).toBe(false);
    });

    it('is valid with quoted YAML values', () => {
      expect(isActionValid(inline())).toBe(true);
    });

    it('is valid with unquoted YAML values', () => {
      expect(
        isActionValid(
          withStepOverrides({ params: 'to: user@example.com\nsubject: Hi\nmessage: Body\n' })
        )
      ).toBe(true);
    });

    it('is valid when values reference dispatcher payload templating', () => {
      expect(
        isActionValid(
          withStepOverrides({
            params: 'to: ops@example.com\nsubject: Alert\nmessage: "{{ inputs.episodes }}"\n',
          })
        )
      ).toBe(true);
    });

    it('is invalid for the untouched (empty) template', () => {
      expect(
        isActionValid(withStepOverrides({ params: 'to: ""\nsubject: ""\nmessage: ""\n' }))
      ).toBe(false);
    });

    it('is invalid when any field is left empty', () => {
      expect(
        isActionValid(
          withStepOverrides({ params: 'to: user@example.com\nsubject: ""\nmessage: Body\n' })
        )
      ).toBe(false);
    });

    it('is invalid for empty params', () => {
      expect(isActionValid(withStepOverrides({ params: '' }))).toBe(false);
    });

    it('is invalid for malformed YAML', () => {
      expect(isActionValid(withStepOverrides({ params: 'to: "unterminated\n' }))).toBe(false);
    });
  });
});
