/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { registerImpactAttachmentTypes } from './impact/attachments';
import { registerImpactPublicStepDefinitions } from './impact/step_types';
import type {
  AgenticInvestigationsPublicPluginSetup,
  AgenticInvestigationsPublicPluginStart,
  AgenticInvestigationsPublicSetupDependencies,
  AgenticInvestigationsPublicStartDependencies,
} from './types';

/**
 * Registers Impact workflow steps and the Impact attachment UI. Escalations
 * and user profiles are consumed directly by a solution's UI.
 */
export class AgenticInvestigationsPublicPlugin
  implements
    Plugin<
      AgenticInvestigationsPublicPluginSetup,
      AgenticInvestigationsPublicPluginStart,
      AgenticInvestigationsPublicSetupDependencies,
      AgenticInvestigationsPublicStartDependencies
    >
{
  setup(
    _core: CoreSetup,
    { workflowsExtensions }: AgenticInvestigationsPublicSetupDependencies
  ): AgenticInvestigationsPublicPluginSetup {
    registerImpactPublicStepDefinitions(workflowsExtensions);
    return {};
  }

  start(
    _core: CoreStart,
    { agentBuilder }: AgenticInvestigationsPublicStartDependencies
  ): AgenticInvestigationsPublicPluginStart {
    if (agentBuilder) {
      registerImpactAttachmentTypes(agentBuilder);
    }
    return {};
  }

  stop() {}
}
