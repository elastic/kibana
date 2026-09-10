/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { registerProposalsPublicStepDefinitions } from './proposals/step_types';
import type {
  AgenticInvestigationsPublicPluginSetup,
  AgenticInvestigationsPublicPluginStart,
  AgenticInvestigationsPublicSetupDependencies,
  AgenticInvestigationsPublicStartDependencies,
} from './types';

export class AgenticInvestigationsPublicPlugin
  implements Plugin<AgenticInvestigationsPublicPluginSetup, AgenticInvestigationsPublicPluginStart>
{
  setup(
    _core: CoreSetup,
    { workflowsExtensions }: AgenticInvestigationsPublicSetupDependencies
  ): AgenticInvestigationsPublicPluginSetup {
    registerProposalsPublicStepDefinitions(workflowsExtensions);
    return {};
  }

  start(
    core: CoreStart,
    startDeps: AgenticInvestigationsPublicStartDependencies
  ): AgenticInvestigationsPublicPluginStart {
    if (startDeps.agentBuilder) {
      const agentBuilder = startDeps.agentBuilder;
      void import('./proposals/attachments').then(({ registerProposalAttachmentTypes }) => {
        registerProposalAttachmentTypes(agentBuilder, core.http);
      });
    }
    return {};
  }

  stop() {}
}
