/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { registerPublicStepDefinitions } from './step_types';
import type {
  ConversationProposalsPublicPluginSetup,
  ConversationProposalsPublicPluginStart,
  ConversationProposalsPublicSetupDependencies,
} from './types';

export class ConversationProposalsPublicPlugin
  implements Plugin<ConversationProposalsPublicPluginSetup, ConversationProposalsPublicPluginStart>
{
  setup(
    _core: CoreSetup,
    { workflowsExtensions }: ConversationProposalsPublicSetupDependencies
  ): ConversationProposalsPublicPluginSetup {
    registerPublicStepDefinitions(workflowsExtensions);
    return {};
  }

  start(_core: CoreStart): ConversationProposalsPublicPluginStart {
    return {};
  }

  stop() {}
}
