/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { WikiRegistry } from '../wiki/wiki_registry';
import { getRecallPageStepDefinition } from './recall_page_step';
import { getRecordEntryStepDefinition } from './record_entry_step';

export const registerStepDefinitions = ({
  workflowsExtensions,
  registry,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  registry: WikiRegistry;
}): void => {
  workflowsExtensions.registerStepDefinition(getRecallPageStepDefinition({ registry }));
  workflowsExtensions.registerStepDefinition(getRecordEntryStepDefinition({ registry }));
};

export { getRecallPageStepDefinition } from './recall_page_step';
export { getRecordEntryStepDefinition } from './record_entry_step';
