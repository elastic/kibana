/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';

const workflowTool = <TName extends string>(
  toolName: TName
): `${typeof internalNamespaces.workflows}.${TName}` => {
  return `${internalNamespaces.workflows}.${toolName}`;
};

export const workflowTools = {
  insertStep: workflowTool('workflow_insert_step'),
  modifyStep: workflowTool('workflow_modify_step'),
  modifyStepProperty: workflowTool('workflow_modify_step_property'),
  modifyProperty: workflowTool('workflow_modify_property'),
  deleteStep: workflowTool('workflow_delete_step'),
  setYaml: workflowTool('workflow_set_yaml'),
  getStepDefinitions: workflowTool('get_step_definitions'),
  getTriggerDefinitions: workflowTool('get_trigger_definitions'),
  validateWorkflow: workflowTool('validate_workflow'),
  getExamples: workflowTool('get_examples'),
  getConnectors: workflowTool('get_connectors'),
  executeStep: workflowTool('workflow_execute_step'),
} as const;
