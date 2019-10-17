/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { management, MANAGEMENT_BREADCRUMB } from 'ui/management';
import { capabilities } from 'ui/capabilities';
import { CoreStart } from 'kibana/public';

export interface AppPlugins {
  management: {
    sections: typeof management;
    getSection(): any;
    breadcrumb: any;
  };
  capabilities: {
    get: () => any;
  };
}

export interface AppDependencies {
  core: CoreStart;
  plugins: AppPlugins;
}

export function createShim() {
  return {
    pluginsSetup: {
      management: {
        getSection: management.getSection.bind(management),
      },
    },
    pluginsStart: {
      capabilities,
      management: {
        breadcrumb: MANAGEMENT_BREADCRUMB,
      },
    },
  };
}
