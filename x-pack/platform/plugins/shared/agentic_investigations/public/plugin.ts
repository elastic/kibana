/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { registerProposalsPublicStepDefinitions } from './proposals/step_types';
import {
  registerInvestigationAttachmentUITypes,
  registerInvestigationTemplateUI,
} from './investigations';
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
    _core: CoreStart,
    { agentBuilder }: AgenticInvestigationsPublicStartDependencies
  ): AgenticInvestigationsPublicPluginStart {
    // Register UI renderers for each of the four investigation attachment types.
    registerInvestigationAttachmentUITypes(agentBuilder.attachments);

    // Register the investigation conversation template UI.
    registerInvestigationTemplateUI(agentBuilder.conversationTemplates);

    return {};
  }

  stop() {}
}
