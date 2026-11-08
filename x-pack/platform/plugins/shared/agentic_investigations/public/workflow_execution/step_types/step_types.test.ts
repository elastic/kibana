/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import { AppendWorkflowExecutionIdStepId } from '../../../common/workflow_execution/step_types';
import { registerWorkflowExecutionPublicStepDefinitions } from '.';

it('lazily registers the append step with the same ID as the server', async () => {
  const extensions: jest.Mocked<WorkflowsExtensionsPublicPluginSetup> = {
    registerStepDefinition: jest.fn(),
    registerTriggerDefinition: jest.fn(),
  };
  registerWorkflowExecutionPublicStepDefinitions(extensions);

  expect(extensions.registerStepDefinition).toHaveBeenCalledTimes(1);
  const [[load]] = extensions.registerStepDefinition.mock.calls;
  expect(typeof load).toBe('function');
  if (typeof load !== 'function') {
    throw new Error('Expected a lazy step definition');
  }
  expect(await load()).toMatchObject({
    id: AppendWorkflowExecutionIdStepId,
    icon: expect.anything(),
  });
});
