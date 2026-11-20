/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { workflowDefaultYaml, workflowYamlEditorSeedYaml } from './workflow_default_yml';
import { isStructurallyEmptyWorkflowYaml } from '../../../entities/workflows/store/workflow_detail/utils/is_structurally_empty_workflow_yaml';

describe('workflow default yaml helpers', () => {
  it('keeps create seed structurally empty', () => {
    expect(isStructurallyEmptyWorkflowYaml(workflowDefaultYaml)).toBe(true);
  });

  it('treats the YAML editor seed as structured', () => {
    expect(isStructurallyEmptyWorkflowYaml(workflowYamlEditorSeedYaml)).toBe(false);
    expect(workflowYamlEditorSeedYaml).toContain('hello_world_step');
    expect(workflowYamlEditorSeedYaml).toContain('type: manual');
  });
});
