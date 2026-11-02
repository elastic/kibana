/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACTION_POLICY_AUTHORING_SKILL_ID, ALERTING_TOOL_IDS } from '@kbn/alerting-v2-constants';
import type { LoggerServiceContract } from '../../lib/services/logger_service/logger_service';
import type { AttachActionPolicyToolDeps } from '../tools/attach_action_policy';
import type { FindActionPoliciesToolDeps } from '../tools/find_action_policies';
import type { ManageActionPolicyToolDeps } from '../tools/manage_action_policy';
import { createAlertingV2Availability } from './alerting_v2_availability';
import { createActionPolicyAuthoringSkill } from './action_policy_authoring_skill';
import {
  referencedContentSkillPath,
  WORKFLOW_DISPATCH_PAYLOAD_REFERENCE,
  WORKFLOW_DISPATCH_PAYLOAD_SKILL_REF,
} from './action_policy_management_references';

const createDeps = (): ManageActionPolicyToolDeps &
  FindActionPoliciesToolDeps &
  AttachActionPolicyToolDeps & {
    availability: ReturnType<typeof createAlertingV2Availability>;
  } => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    forSubsystem: jest.fn(),
  } as unknown as LoggerServiceContract,
  getWorkflowClient: jest.fn(() => ({ getWorkflow: jest.fn(async () => null) })),
  getAvailableConnectors: jest.fn(async () => ({ connectorTypes: {} })),
  getActionPolicyClient: jest.fn(),
  getPrivilegeChecker: jest.fn(),
  availability: createAlertingV2Availability({
    getActiveSpace: jest.fn().mockResolvedValue({}),
  }),
});

describe('createActionPolicyAuthoringSkill', () => {
  it('generates schema docs without throwing', () => {
    expect(() => createActionPolicyAuthoringSkill(createDeps())).not.toThrow();
  });

  it('registers the skill under the stable action-policy-authoring id and name', () => {
    const skill = createActionPolicyAuthoringSkill(createDeps());

    expect(skill.id).toBe(ACTION_POLICY_AUTHORING_SKILL_ID);
    expect(skill.name).toBe(ACTION_POLICY_AUTHORING_SKILL_ID);
    expect(skill.basePath).toBe('skills/platform/alerting');
  });

  it('is not gated behind agent builder experimental features', () => {
    const skill = createActionPolicyAuthoringSkill(createDeps());

    expect(skill.experimental).not.toBe(true);
  });

  it('gates the skill on the alerting:v2:enabled advanced setting', () => {
    const skill = createActionPolicyAuthoringSkill(createDeps());

    expect(skill.uiSettingRequired).toBe('alerting:v2:enabled');
  });

  it('stays available when universal alerting experimental features are disabled', async () => {
    const skill = createActionPolicyAuthoringSkill(createDeps());
    const uiSettings = { get: jest.fn().mockResolvedValue(false) };

    await expect(
      skill.availability?.handler({ request: {}, uiSettings } as never)
    ).resolves.toEqual({
      status: 'available',
    });
    expect(uiSettings.get).not.toHaveBeenCalled();
  });

  it('exposes only the action policy inline tools to manage, find and attach policies', async () => {
    const skill = createActionPolicyAuthoringSkill(createDeps());

    const inlineTools = (await skill.getInlineTools?.()) ?? [];
    const inlineToolIds = inlineTools.map((tool) => tool.id);

    expect(inlineToolIds).toEqual([
      ALERTING_TOOL_IDS.manageActionPolicy,
      ALERTING_TOOL_IDS.findActionPolicies,
      ALERTING_TOOL_IDS.attachActionPolicy,
    ]);
    expect(inlineToolIds).not.toContain(ALERTING_TOOL_IDS.manageRule);
  });

  it('includes action policy discovery and default notification setup instructions', () => {
    const skill = createActionPolicyAuthoringSkill(createDeps());

    expect(skill.content).toContain('Action Policy Discovery');
    expect(skill.content).toContain(ALERTING_TOOL_IDS.findActionPolicies);
    expect(skill.content).toContain(ALERTING_TOOL_IDS.attachActionPolicy);
    expect(skill.content).toContain('space-scoped saved object');
    expect(skill.content).not.toContain('Part 1: Action Policies');
    expect(skill.content).toContain('Default Notification Setup');
    expect(skill.content).toContain('action-policy-single-rule.md');
    expect(skill.content).toContain('action-policy-multi-rule.md');
    expect(skill.content).not.toContain('## Multi-rule policies');
    expect(skill.content).not.toContain('Step 2 — Create a Default Action Policy');
    expect(skill.content).toContain('workflow-authoring');
    expect(skill.content).not.toContain('Building the Workflow YAML');
  });

  it('inlines the action policy operations schema in skill content and defers concepts to When to Load References', () => {
    const skill = createActionPolicyAuthoringSkill(createDeps());

    expect(skill.content).toContain('Action Policy Operations Schema Reference');
    expect(skill.content).toContain('When to Load References');
    expect(skill.content).not.toContain('Domain Knowledge');
    expect(skill.content).not.toContain('Part 1: Action Policies');
    expect(skill.content).not.toContain('Part 2: Default Notification Setup');
  });

  it('exposes the generated workflow dispatch payload schema as referenced content', () => {
    const skill = createActionPolicyAuthoringSkill(createDeps());
    const payloadRef = skill.referencedContent?.find(
      (entry) => entry.name === 'workflow-dispatch-payload'
    );

    expect(payloadRef?.content).toContain('Action Policy Workflow Dispatch Payload');
    expect(payloadRef?.content).toContain('### `data`');
    expect(payloadRef?.content).toContain('## Example');
    expect(payloadRef?.content).toContain('"policyId"');
    expect(payloadRef?.content).toContain('"alerts"');
    expect(payloadRef?.content).toContain('"rules"');
    expect(payloadRef?.content).toContain('"alert_status"');
  });

  it('derives the workflow dispatch payload filestore path from the registered reference', () => {
    const skill = createActionPolicyAuthoringSkill(createDeps());
    const payloadRef = skill.referencedContent?.find(
      (entry) => entry.name === WORKFLOW_DISPATCH_PAYLOAD_REFERENCE.name
    );

    expect(payloadRef).toEqual(expect.objectContaining(WORKFLOW_DISPATCH_PAYLOAD_REFERENCE));
    expect(skill.basePath).toBe('skills/platform/alerting');
    expect(WORKFLOW_DISPATCH_PAYLOAD_SKILL_REF).toBe(
      referencedContentSkillPath({
        basePath: skill.basePath,
        name: skill.name,
        referencedContent: {
          name: payloadRef?.name ?? '',
          relativePath: payloadRef?.relativePath ?? '',
        },
      })
    );
    expect(WORKFLOW_DISPATCH_PAYLOAD_SKILL_REF).toBe(
      'skills/platform/alerting/action-policy-authoring/references/workflow-dispatch-payload.md'
    );
  });

  it('exposes schema-generated matcher, grouping, and throttle references', () => {
    const skill = createActionPolicyAuthoringSkill(createDeps());
    const byName = Object.fromEntries(
      (skill.referencedContent ?? []).map((entry) => [entry.name, entry.content])
    );

    expect(byName['action-policy-matchers']).toContain('# Action Policy Matchers');
    expect(byName['action-policy-matchers']).toContain('`alert_status`');
    expect(byName['action-policy-matchers']).toContain('matcher.tags');
    // rule.id/rule.tags appear in an exclusion note, not as usable KQL field:value syntax
    expect(byName['action-policy-matchers']).not.toContain('rule.id:');
    expect(byName['action-policy-matchers']).not.toContain('rule.tags:');

    expect(byName['action-policy-grouping-modes']).toContain('`per_alert`');
    expect(byName['action-policy-throttle-strategies']).toContain('`on_status_change`');
    expect(byName['action-policy-throttle-strategies']).toContain(
      'action-policy-throttle-grouping-compatibility.md'
    );
    expect(byName['action-policy-throttle-grouping-compatibility']).toContain(
      '# Throttle / Grouping Compatibility'
    );
    expect(byName['action-policy-throttle-grouping-compatibility']).toContain('`per_alert`');

    expect(byName['workflow-destinations']).toContain('# Workflows');
    expect(byName['dispatch-flow']).toContain('# Dispatch Flow');
    expect(byName['action-policy-single-rule']).toContain('# Single-rule Action Policies');
    expect(byName['action-policy-single-rule']).toContain('action-policy-multi-rule.md');
    expect(byName['action-policy-multi-rule']).toContain('# Multi-rule Action Policies');
    expect(byName['action-policy-multi-rule']).toContain('Catch-all');
    expect(byName['action-policy-schema']).toBeUndefined();
    expect(byName['action-policy-operations-schema']).toBeUndefined();
    expect(byName.concepts).toBeUndefined();
  });

  it('defers throttle strategy details to referenced content instead of teaching a two-strategy model', () => {
    const skill = createActionPolicyAuthoringSkill(createDeps());

    expect(skill.content).toContain('action-policy-throttle-strategies.md');
    expect(skill.content).toContain('action-policy-throttle-grouping-compatibility.md');
    expect(skill.content).not.toContain(
      '`on_status_change` (default) only notifies on transitions, `every_time` notifies on every evaluation cycle'
    );
    expect(skill.content).not.toContain('change from `on_status_change` vs `every_time`');
  });
});
