/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type {
  AgenticInvestigationsPublicPluginSetup,
  AgenticInvestigationsPublicPluginStart,
} from './types';

/**
 * The browser side contributes hooks rather than registrations: escalations and
 * user profiles are consumed directly by a solution's UI.
 */
export class AgenticInvestigationsPublicPlugin
  implements Plugin<AgenticInvestigationsPublicPluginSetup, AgenticInvestigationsPublicPluginStart>
{
  setup(_core: CoreSetup): AgenticInvestigationsPublicPluginSetup {
    return {};
  }

  start(_core: CoreStart): AgenticInvestigationsPublicPluginStart {
    return {};
  }

  stop() {}
}
