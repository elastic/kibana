/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin } from '@kbn/core/server';
import { SEARCH_BOOST_APP_ID } from '../common/constants';
import type { SearchBoostSetupDependencies } from './types';

export class SearchBoostPlugin implements Plugin<void, void, SearchBoostSetupDependencies> {
  public setup(_core: CoreSetup, { features }: SearchBoostSetupDependencies) {
    // Profiles and rules are shown together, so each level needs the privilege for both.
    features.registerElasticsearchFeature({
      id: SEARCH_BOOST_APP_ID,
      management: {
        data: [SEARCH_BOOST_APP_ID],
      },
      privileges: [
        {
          requiredClusterPrivileges: ['manage_boost_profiles', 'manage_boost_rules'],
          ui: ['save'],
        },
        {
          requiredClusterPrivileges: ['read_boost_profiles', 'read_boost_rules'],
          ui: ['show'],
        },
      ],
    });
  }

  public start() {}

  public stop() {}
}
