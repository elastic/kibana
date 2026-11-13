/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { WikiService } from '../services/wiki_service';
import { getRecallWikiStepDefinition } from './recall_wiki_step';
import { getRecordWikiStepDefinition } from './record_wiki_step';

export const registerStepDefinitions = ({
  workflowsExtensions,
  getWikiService,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  getWikiService: () => WikiService;
}) => {
  workflowsExtensions.registerStepDefinition(getRecallWikiStepDefinition({ getWikiService }));
  workflowsExtensions.registerStepDefinition(getRecordWikiStepDefinition({ getWikiService }));
};

export { getRecallWikiStepDefinition } from './recall_wiki_step';
export { getRecordWikiStepDefinition } from './record_wiki_step';
