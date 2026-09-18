/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { ESQL_VIEWS_CAPABILITIES, PLUGIN_ID } from '../common';

interface SetupDependencies {
  features: FeaturesPluginSetup;
}

const ALL_VIEWS_PATTERN = '*';

export class EsqlViewsServerPlugin implements Plugin<void, void, SetupDependencies> {
  public setup(_core: CoreSetup, { features }: SetupDependencies): void {
    features.registerElasticsearchFeature({
      id: PLUGIN_ID,
      management: {
        data: [PLUGIN_ID],
      },
      privileges: [
        {
          requiredClusterPrivileges: [],
          requiredIndexPrivileges: {
            [ALL_VIEWS_PATTERN]: ['read_view_metadata'],
          },
          ui: [ESQL_VIEWS_CAPABILITIES.read],
        },
        {
          requiredClusterPrivileges: [],
          requiredIndexPrivileges: {
            [ALL_VIEWS_PATTERN]: ['read_view_metadata', 'create_view'],
          },
          ui: [ESQL_VIEWS_CAPABILITIES.create, ESQL_VIEWS_CAPABILITIES.edit],
        },
        {
          requiredClusterPrivileges: [],
          requiredIndexPrivileges: {
            [ALL_VIEWS_PATTERN]: ['read_view_metadata', 'delete_view'],
          },
          ui: [ESQL_VIEWS_CAPABILITIES.delete],
        },
      ],
    });
  }

  public start(): void {}

  public stop(): void {}
}
