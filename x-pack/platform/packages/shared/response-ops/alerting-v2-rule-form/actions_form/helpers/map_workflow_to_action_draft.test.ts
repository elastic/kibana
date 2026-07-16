/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import { INLINE_WORKFLOW_TAG } from '../constants';
import { buildInlineWorkflowYaml } from './build_inline_workflow_yaml';
import {
  mapWorkflowToActionDraft,
  type WorkflowForActionDraft,
} from './map_workflow_to_action_draft';

const inlineWorkflow = (
  step: NonNullable<NonNullable<WorkflowForActionDraft['definition']>['steps']>[number],
  tags: string[] = [INLINE_WORKFLOW_TAG]
): WorkflowForActionDraft => ({
  id: 'wf-1',
  definition: { tags, steps: [step] },
});

describe('mapWorkflowToActionDraft', () => {
  it('maps a tagged email workflow to an inline draft', () => {
    const draft = mapWorkflowToActionDraft(
      inlineWorkflow({
        type: 'email',
        'connector-id': 'my-email-connector',
        with: { to: 'ops@example.com', subject: 'Alert', message: 'Body' },
      })
    );

    expect(draft).toEqual({
      id: 'wf-1',
      source: 'inline',
      stepType: 'email',
      connectorId: 'my-email-connector',
      params: expect.any(String),
    });
    expect(parse(draft.source === 'inline' ? draft.params : '')).toEqual({
      to: 'ops@example.com',
      subject: 'Alert',
      message: 'Body',
    });
  });

  it('maps a tagged slack workflow to an inline draft', () => {
    const draft = mapWorkflowToActionDraft(
      inlineWorkflow({
        type: 'slack2.sendMessage',
        'connector-id': 'my-slack-connector',
        with: { channel: 'my-channel', text: 'Hello' },
      })
    );

    expect(draft).toMatchObject({
      source: 'inline',
      stepType: 'slack2.sendMessage',
      connectorId: 'my-slack-connector',
    });
  });

  it('round-trips with buildInlineWorkflowYaml', () => {
    const yaml = buildInlineWorkflowYaml({
      id: 'wf-1',
      source: 'inline',
      stepType: 'email',
      connectorId: 'c1',
      params: 'to: "ops@example.com"\nsubject: "Alert"\nmessage: "Body"',
    });

    const draft = mapWorkflowToActionDraft({ id: 'wf-1', definition: parse(yaml) });

    expect(draft).toMatchObject({
      source: 'inline',
      stepType: 'email',
      connectorId: 'c1',
    });
    expect(parse(draft.source === 'inline' ? draft.params : '')).toEqual({
      to: 'ops@example.com',
      subject: 'Alert',
      message: 'Body',
    });
  });

  it('maps an untagged workflow to an existing-workflow draft', () => {
    const draft = mapWorkflowToActionDraft(
      inlineWorkflow({ type: 'email', 'connector-id': 'c1', with: {} }, ['some-other-tag'])
    );

    expect(draft).toEqual({
      id: 'wf-1',
      source: 'existing',
      workflowId: 'wf-1',
    });
  });

  it('falls back to an existing-workflow draft for an unknown inline step type', () => {
    const draft = mapWorkflowToActionDraft(
      inlineWorkflow({ type: 'pagerduty', 'connector-id': 'c1', with: {} })
    );

    expect(draft).toMatchObject({ source: 'existing', workflowId: 'wf-1' });
  });

  it('falls back to an existing-workflow draft when there are no steps', () => {
    const draft = mapWorkflowToActionDraft({
      id: 'wf-1',
      definition: { tags: [INLINE_WORKFLOW_TAG], steps: [] },
    });

    expect(draft).toMatchObject({ source: 'existing', workflowId: 'wf-1' });
  });

  it('matches inline step types tolerant of a leading dot or sub-action', () => {
    const dotted = mapWorkflowToActionDraft(
      inlineWorkflow({ type: '.email', 'connector-id': 'c1', with: { to: 'a@b.com' } })
    );
    expect(dotted).toMatchObject({ source: 'inline', stepType: 'email' });

    const subAction = mapWorkflowToActionDraft(
      inlineWorkflow({
        type: 'slack2.sendMessage',
        'connector-id': 'c2',
        with: { channel: 'my-channel', text: 'hi' },
      })
    );
    expect(subAction).toMatchObject({ source: 'inline', stepType: 'slack2.sendMessage' });
  });

  it('attaches the provided origin to an inline draft', () => {
    const origin = { policyId: 'p-1', policyVersion: 'v1', workflowId: 'wf-1' };
    const draft = mapWorkflowToActionDraft(
      inlineWorkflow({ type: 'email', 'connector-id': 'c1', with: { to: 'a@b.com' } }),
      origin
    );

    expect(draft).toMatchObject({ source: 'inline', stepType: 'email', origin });
  });

  it('uses the policy id as the row id when populating', () => {
    const workflow = inlineWorkflow({
      type: 'email',
      'connector-id': 'c1',
      with: { to: 'a@b.com' },
    });

    const first = mapWorkflowToActionDraft(workflow, {
      policyId: 'p-1',
      workflowId: 'wf-1',
    });
    const second = mapWorkflowToActionDraft(workflow, {
      policyId: 'p-2',
      workflowId: 'wf-1',
    });

    expect(first.id).toBe('p-1');
    expect(second.id).toBe('p-2');
    expect(first.id).not.toBe(second.id);
  });

  it('attaches the provided origin to an existing-workflow draft', () => {
    const origin = { policyId: 'p-2', policyVersion: 'v2', workflowId: 'wf-1' };
    const draft = mapWorkflowToActionDraft(
      inlineWorkflow({ type: 'email', 'connector-id': 'c1', with: {} }, ['some-other-tag']),
      origin
    );

    expect(draft).toEqual({
      id: 'p-2',
      source: 'existing',
      workflowId: 'wf-1',
      origin,
    });
  });

  it('omits origin when none is provided', () => {
    const draft = mapWorkflowToActionDraft(
      inlineWorkflow({ type: 'email', 'connector-id': 'c1', with: { to: 'a@b.com' } })
    );
    expect(draft).not.toHaveProperty('origin');
  });

  it('parses the raw yaml when definition is not populated', () => {
    const yaml = buildInlineWorkflowYaml({
      id: 'wf-1',
      source: 'inline',
      stepType: 'email',
      connectorId: 'c1',
      params: 'to: "ops@example.com"\nsubject: "Alert"\nmessage: "Body"',
    });

    const draft = mapWorkflowToActionDraft({ id: 'wf-1', definition: null, yaml });

    expect(draft).toMatchObject({
      source: 'inline',
      stepType: 'email',
      connectorId: 'c1',
    });
    expect(parse(draft.source === 'inline' ? draft.params : '')).toEqual({
      to: 'ops@example.com',
      subject: 'Alert',
      message: 'Body',
    });
  });
});
