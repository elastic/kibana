/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin } from '@kbn/core/server';
import { PLUGIN_ID } from '../common/constants';
import type { SearchBoostSetupDependencies } from './types';

export class SearchBoostPlugin implements Plugin<void, void, SearchBoostSetupDependencies> {
  public setup(_core: CoreSetup, { features }: SearchBoostSetupDependencies) {
    // The `_boost` APIs are `cluster:admin/boost/*` for writes and `cluster:monitor/boost/*` for
    // reads, which `manage` and `monitor` cover; there is no boost-specific privilege.
    features.registerElasticsearchFeature({
      id: PLUGIN_ID,
      management: {
        data: [PLUGIN_ID],
      },
      privileges: [
        {
          requiredClusterPrivileges: ['manage'],
          ui: ['save'],
        },
        {
          requiredClusterPrivileges: ['monitor'],
          ui: ['show'],
        },
      ],
    });
  }

  public start() {}

  public stop() {}
}
