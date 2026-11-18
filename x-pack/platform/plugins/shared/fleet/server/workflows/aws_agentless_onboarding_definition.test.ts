/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import {
  FLEET_AWS_AGENTLESS_ONBOARDING_WORKFLOW_ID,
  getManagedWorkflowDefinition,
} from '@kbn/workflows/managed';

// The registry test validates this YAML against the workflow schema; this test pins its structure.
interface StepNode {
  name: string;
  type: string;
  condition?: string;
  with?: Record<string, unknown>;
  steps?: StepNode[];
}

const loadDefinition = (): { steps: StepNode[] } => {
  const definition = getManagedWorkflowDefinition(FLEET_AWS_AGENTLESS_ONBOARDING_WORKFLOW_ID);
  if (!definition?.yaml) {
    throw new Error('The AWS agentless onboarding workflow is not registered.');
  }
  return parse(definition.yaml);
};

const topLevelStepNames = ({ steps }: { steps: StepNode[] }) => steps.map(({ name }) => name);

const findStep = ({ steps }: { steps: StepNode[] }, name: string): StepNode => {
  const found = steps.find((step) => step.name === name);
  if (!found) throw new Error(`Step '${name}' is not defined.`);
  return found;
};

describe('AWS agentless onboarding workflow definition', () => {
  const definition = loadDefinition();

  it('defines the steps in order', () => {
    expect(topLevelStepNames(definition)).toEqual([
      'credentials',
      'credentials_missing',
      'discovery',
      'list_identities',
      'settings_requirement',
      'ask_plan',
      'resolve',
      'approve_plan',
      'fail_plan_rejected',
      'stack_branch',
      'create_policies',
      'wait_for_data',
      'done',
    ]);
  });

  it('runs discovery and selection only when the run starts without services', () => {
    const branch = findStep(definition, 'discovery');

    expect(branch.type).toBe('if');
    expect(branch.condition).toContain('inputs.services');
    expect(branch.steps?.map(({ name }) => name)).toEqual([
      'ask_discover',
      'fail_no_discover',
      'discover',
      'select_services',
    ]);
  });

  it('creates the stack and connector only when the plan creates a new identity', () => {
    const branch = findStep(definition, 'stack_branch');

    expect(branch.type).toBe('if');
    expect(branch.condition).toBe("${{ steps.resolve.output.stack_action == 'create' }}");
    expect(branch.steps?.map(({ name }) => name)).toEqual([
      'cloud_context',
      'create_stack',
      'poll_stack',
      'fail_stack',
      'create_connector',
    ]);
  });

  it('creates the policies on the new connector or on the reused one', () => {
    expect(findStep(definition, 'create_policies').with?.cloud_connector_id).toBe(
      '{{ steps.create_connector.output.cloud_connector_id | default: steps.resolve.output.cloud_connector_id }}'
    );
  });

  it('fails the run when the plan is not approved', () => {
    const branch = findStep(definition, 'fail_plan_rejected');

    expect(branch.condition).toBe('${{ steps.approve_plan.output.response.approved != true }}');
    expect(branch.steps).toEqual([
      expect.objectContaining({
        type: 'workflow.fail',
        with: { message: 'The plan was not approved.', reason: 'plan_rejected' },
      }),
    ]);
  });
});
