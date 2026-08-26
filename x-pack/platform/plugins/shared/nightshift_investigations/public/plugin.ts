/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import {
  createNightshiftInvestigationsRepositoryClient,
  type NightshiftInvestigationsRepositoryClient,
} from './api';

export type NightshiftInvestigationsPublicSetup = void;

export interface NightshiftInvestigationsPublicStart {
  investigationsClient: NightshiftInvestigationsRepositoryClient;
}

export class NightshiftInvestigationsPublicPlugin
  implements Plugin<NightshiftInvestigationsPublicSetup, NightshiftInvestigationsPublicStart>
{
  setup(_core: CoreSetup): NightshiftInvestigationsPublicSetup {}

  start(core: CoreStart): NightshiftInvestigationsPublicStart {
    return {
      investigationsClient: createNightshiftInvestigationsRepositoryClient(core),
    };
  }
}
