/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';

/**
 * Browser registry backs YAML editor validation. Register as loaders so schemas
 * stay out of the page-load bundle.
 */
export const registerAgentKnowledgePublicStepDefinitions = (
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup
) => {
  workflowsExtensions.registerStepDefinition(() =>
    import('@kbn/agent-knowledge-common').then((m) => m.recallWikiStepCommonDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('@kbn/agent-knowledge-common').then((m) => m.recordWikiStepCommonDefinition)
  );
};
