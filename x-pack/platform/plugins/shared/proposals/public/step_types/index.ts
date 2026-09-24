/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';

/**
 * The browser registry backs YAML editor validation, autocomplete and icons.
 * Registering server-side alone leaves the steps invisible to the editor.
 *
 * Every definition is registered as a loader rather than a value, so none of it
 * reaches the page-load bundle. A step definition drags in its zod input and
 * output schemas, its i18n strings and `@kbn/workflows`, and only the YAML
 * editor ever needs any of that — so it belongs in an async chunk that loads
 * with the editor. `registerStepDefinition` accepts a
 * `() => Promise<PublicStepDefinition>` for exactly this.
 */
export const registerProposalsPublicStepDefinitions = (
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup
) => {
  workflowsExtensions.registerStepDefinition(() =>
    import('./create_proposal_step').then((m) => m.createProposalPublicStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./update_proposal_step').then((m) => m.updateProposalPublicStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./check_decide_privileges_step').then(
      (m) => m.checkDecidePrivilegesPublicStepDefinition
    )
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./get_proposal_step').then((m) => m.getProposalPublicStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./clone_proposal_step').then((m) => m.cloneProposalPublicStepDefinition)
  );
};
