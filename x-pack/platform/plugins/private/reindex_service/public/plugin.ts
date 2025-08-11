/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup } from '@kbn/core/public';

import { ReindexService } from './src/reindex_service';
import type { ReindexServicePublicSetup, ReindexServicePublicStart } from './types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface SetupDependencies {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface StartDependencies {}

export class ReindexServerPublicPlugin
  implements
    Plugin<
      ReindexServicePublicSetup,
      ReindexServicePublicStart,
      SetupDependencies,
      StartDependencies
    >
{
  private reindexService?: ReindexService;

  setup({ http }: CoreSetup<SetupDependencies>) {
    this.reindexService = new ReindexService(http);
    return {
      reindexService: this.reindexService,
    };
  }

  start() {
    return {
      reindexService: this.reindexService!,
    };
  }
  stop() {}
}
