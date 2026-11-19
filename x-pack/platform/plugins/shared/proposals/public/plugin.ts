/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { registerProposalsPublicStepDefinitions } from './step_types';
import type {
  ProposalsPublicPluginSetup,
  ProposalsPublicPluginStart,
  ProposalsPublicSetupDependencies,
  ProposalsPublicStartDependencies,
} from './types';

export class ProposalsPublicPlugin
  implements Plugin<ProposalsPublicPluginSetup, ProposalsPublicPluginStart>
{
  setup(
    _core: CoreSetup,
    { workflowsExtensions }: ProposalsPublicSetupDependencies
  ): ProposalsPublicPluginSetup {
    registerProposalsPublicStepDefinitions(workflowsExtensions);
    return {};
  }

  start(core: CoreStart, startDeps: ProposalsPublicStartDependencies): ProposalsPublicPluginStart {
    if (startDeps.agentBuilder) {
      const agentBuilder = startDeps.agentBuilder;
      void import('./attachments').then(({ registerProposalAttachmentTypes }) => {
        registerProposalAttachmentTypes(agentBuilder);
      });
    }
    return {};
  }

  stop() {}
}
