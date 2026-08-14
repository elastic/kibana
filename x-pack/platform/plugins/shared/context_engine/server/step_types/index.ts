/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { AiIndexService } from '../ai_indices/service';
import { getCreateKiStepDefinition } from './create_ki';
import { getUpdateKiStepDefinition } from './update_ki';
import { getDeleteKiStepDefinition } from './delete_ki';

/** Registers the Context Engine KI workflow steps with the workflowsExtensions plugin. */
export const registerStepDefinitions = ({
  workflowsExtensions,
  getAiIndexService,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  getAiIndexService: () => AiIndexService;
}): void => {
  workflowsExtensions.registerStepDefinition(getCreateKiStepDefinition(getAiIndexService));
  workflowsExtensions.registerStepDefinition(getUpdateKiStepDefinition(getAiIndexService));
  workflowsExtensions.registerStepDefinition(getDeleteKiStepDefinition(getAiIndexService));
};
