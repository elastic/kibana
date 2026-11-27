/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsWorkflow } from '@kbn/workflows';
import { updateWorkflowYamlFields } from './update_workflow_yaml_fields';

describe('updateWorkflowYamlFields', () => {
  it('should update enabled field', () => {
    const yaml = 'name: Test Workflow\nenabled: true\nsteps: []';
    const workflow: Partial<EsWorkflow> = { enabled: false };

    const result = updateWorkflowYamlFields(yaml, workflow, false);

    expect(result).toContain('enabled: false');
    expect(result).not.toContain('enabled: true');
  });

  it('should update name field', () => {
    const yaml = 'name: Old Name\nsteps: []';
    const workflow: Partial<EsWorkflow> = { name: 'New Name' };

    const result = updateWorkflowYamlFields(yaml, workflow);

    expect(result).toContain('name: New Name');
    expect(result).not.toContain('name: Old Name');
  });

  it('should update multiple fields', () => {
    const yaml = 'name: Old Name\nenabled: true\nsteps: []';
    const workflow: Partial<EsWorkflow> = {
      name: 'New Name',
      enabled: false,
    };

    const result = updateWorkflowYamlFields(yaml, workflow, false);

    expect(result).toContain('name: New Name');
    expect(result).toContain('enabled: false');
    expect(result).not.toContain('name: Old Name');
    expect(result).not.toContain('enabled: true');
  });

  it('should preserve comments and formatting', () => {
    const yaml = `# Comment
name: Test Workflow
# Another comment
enabled: true

steps: []`;
    const workflow: Partial<EsWorkflow> = { enabled: false };

    const result = updateWorkflowYamlFields(yaml, workflow, false);

    expect(result).toContain('# Comment');
    expect(result).toContain('# Another comment');
    expect(result).toContain('\n\n'); // Blank line preserved
    expect(result).toContain('enabled: false');
  });

  it('should preserve comments, blank lines, and formatting when toggling enabled', () => {
    const yaml = `# Workflow configuration
name: Test Workflow

# Whether the workflow is active
enabled: false

steps:
  # Create a Jira ticket
  - name: step1
    type: jira
    params:
      summary: test`;
    const workflow: Partial<EsWorkflow> = { enabled: true };

    const result = updateWorkflowYamlFields(yaml, workflow, true);

    expect(result).toContain('enabled: true');
    expect(result).not.toContain('enabled: false');
    expect(result).toContain('# Workflow configuration');
    expect(result).toContain('# Whether the workflow is active');
    expect(result).toContain('# Create a Jira ticket');
    const blankLineCount = (result.match(/\n\n/g) || []).length;
    expect(blankLineCount).toBeGreaterThanOrEqual(2);
    expect(result).toContain('name: Test Workflow');
    expect(result).toContain('summary: test');
  });

  it('should preserve quoted template expressions when toggling enabled', () => {
    const yaml = `name: Test Workflow
enabled: false
steps:
  - name: step1
    type: jira
    params:
      comment: "{{ inputs.comment }}"
      summary: "{{ inputs.summary }}"`;
    const workflow: Partial<EsWorkflow> = { enabled: true };

    const result = updateWorkflowYamlFields(yaml, workflow, true);

    expect(result).toContain('enabled: true');
    expect(result).toContain('comment: "{{ inputs.comment }}"');
    expect(result).toContain('summary: "{{ inputs.summary }}"');
  });

  it('should use enabledValue parameter when provided', () => {
    const yaml = 'name: Test Workflow\nenabled: true\nsteps: []';
    const workflow: Partial<EsWorkflow> = { enabled: true }; // Request to enable
    const enabledValue = false; // But resolved value is false (e.g., due to validation)

    const result = updateWorkflowYamlFields(yaml, workflow, enabledValue);

    expect(result).toContain('enabled: false'); // Uses enabledValue, not workflow.enabled
  });

  it('removes the description key when set to empty string', () => {
    const yaml = 'name: Test\ndescription: Keep me\nsteps: []';
    const result = updateWorkflowYamlFields(yaml, { description: '' });

    expect(result).not.toContain('description');
    expect(result).toContain('name: Test');
  });

  it('writes an empty tags array when tags are cleared', () => {
    const yaml = 'name: Test\ntags:\n  - alpha\nsteps: []';
    const result = updateWorkflowYamlFields(yaml, { tags: [] });

    expect(result).toMatch(/tags: \[\]/);
    expect(result).not.toContain('alpha');
    expect(result).toContain('name: Test');
  });

  it('removing an empty description keeps the rest of the YAML byte for byte', () => {
    const longMessage = 'word '.repeat(40).trim();
    const rest = `name: Test\nsteps:\n    - name: a\n      type: console\n      with:\n          message: ${longMessage}\n`;
    const yaml = `description: Keep me\n${rest}`;

    expect(updateWorkflowYamlFields(yaml, { description: '' })).toBe(rest);
  });
});
