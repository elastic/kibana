/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AutomationWorkflowsApi } from '@kbn/context-engine-plugin/server/automation_templates/source_automations';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';

const asAutomationWorkflowsApi = (
  management: WorkflowsServerPluginSetup['management']
): AutomationWorkflowsApi => management;

describe('workflows management contract', () => {
  it('satisfies the shape Context Engine installs source automations with', () => {
    expect(asAutomationWorkflowsApi).toEqual(expect.any(Function));
  });
});
