/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createActionPolicyDataSchema } from '@kbn/alerting-v2-schemas';
import { parse } from 'yaml';
import { buildConsoleLogWorkflowYaml, CONSOLE_LOG_WORKFLOW_NAME } from './console_log_workflow';
import { ACTION_POLICY_SAMPLES } from './samples';

describe('ACTION_POLICY_SAMPLES', () => {
  it.each(ACTION_POLICY_SAMPLES.map((sample) => [sample.key, sample] as const))(
    'the %s sample is a valid action policy once a destination is added',
    (_, { data }) => {
      const result = createActionPolicyDataSchema.safeParse({
        ...data,
        destinations: [{ type: 'workflow', id: 'some-workflow-id' }],
      });

      expect(result.success).toBe(true);
    }
  );

  it('uses unique keys and names', () => {
    expect(new Set(ACTION_POLICY_SAMPLES.map(({ key }) => key)).size).toBe(
      ACTION_POLICY_SAMPLES.length
    );
    expect(new Set(ACTION_POLICY_SAMPLES.map(({ data }) => data.name)).size).toBe(
      ACTION_POLICY_SAMPLES.length
    );
  });
});

describe('buildConsoleLogWorkflowYaml', () => {
  it('produces YAML that parses back to the workflow definition', () => {
    const workflow = parse(buildConsoleLogWorkflowYaml());

    expect(workflow).toMatchObject({
      name: CONSOLE_LOG_WORKFLOW_NAME,
      enabled: true,
      triggers: [{ type: 'manual' }],
      steps: [{ name: 'log_notification_group', type: 'console' }],
    });
  });
});
