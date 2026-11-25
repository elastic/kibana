/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { WikiRegistry } from '../wiki/wiki_registry';
import { getRecallPageStepDefinition } from './recall_page_step';
import { getRecordEntryStepDefinition } from './record_entry_step';

export const registerStepDefinitions = ({
  workflowsExtensions,
  registry,
  logger,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  registry: WikiRegistry;
  logger: Logger;
}): void => {
  workflowsExtensions.registerStepDefinition(getRecallPageStepDefinition({ registry, logger }));
  workflowsExtensions.registerStepDefinition(getRecordEntryStepDefinition({ registry, logger }));
};

export { getRecallPageStepDefinition } from './recall_page_step';
export { getRecordEntryStepDefinition } from './record_entry_step';
