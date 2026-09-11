/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';

/**
 * Registers the KI workflow steps when the Context Engine setting is on;
 * enabling it later requires a page reload.
 */
export const registerStepDefinitions = ({
  workflowsExtensions,
  isContextEngineEnabled,
}: {
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup;
  isContextEngineEnabled: () => Promise<boolean>;
}): void => {
  let enabled: Promise<boolean> | undefined;
  const isEnabled = () => (enabled ??= isContextEngineEnabled());

  let definitions: Promise<typeof import('./definitions')> | undefined;
  const loadDefinitions = () => (definitions ??= import('./definitions'));

  workflowsExtensions.registerStepDefinition(async () =>
    (await isEnabled()) ? (await loadDefinitions()).createKiStepDefinition : undefined
  );
  workflowsExtensions.registerStepDefinition(async () =>
    (await isEnabled()) ? (await loadDefinitions()).updateKiStepDefinition : undefined
  );
  workflowsExtensions.registerStepDefinition(async () =>
    (await isEnabled()) ? (await loadDefinitions()).deleteKiStepDefinition : undefined
  );
};
