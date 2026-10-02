/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createActionPolicyDataSchema } from '@kbn/alerting-v2-schemas';
import { buildConsoleLogWorkflowYaml } from './console_log_workflow';
import { ACTION_POLICY_TEMPLATES } from './templates';

describe('ACTION_POLICY_TEMPLATES', () => {
  it.each(ACTION_POLICY_TEMPLATES.map((template) => [template.key, template] as const))(
    'the %s template is a valid action policy once a destination is added',
    (_, { data }) => {
      const result = createActionPolicyDataSchema.safeParse({
        ...data,
        destinations: [{ type: 'workflow', id: 'some-workflow-id' }],
      });

      expect(result.success).toBe(true);
    }
  );

  it('uses unique keys and names', () => {
    expect(new Set(ACTION_POLICY_TEMPLATES.map(({ key }) => key)).size).toBe(
      ACTION_POLICY_TEMPLATES.length
    );
    expect(new Set(ACTION_POLICY_TEMPLATES.map(({ data }) => data.name)).size).toBe(
      ACTION_POLICY_TEMPLATES.length
    );
  });
});

describe('buildConsoleLogWorkflowYaml', () => {
  it('defines a console step receiving the notification group payload', () => {
    const yaml = buildConsoleLogWorkflowYaml();

    expect(yaml).toContain('type: console');
    expect(yaml).toContain('type: manual');
    expect(yaml).toContain('payload');
  });
});
