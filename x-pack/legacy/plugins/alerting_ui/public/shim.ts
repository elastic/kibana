/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { management, MANAGEMENT_BREADCRUMB } from 'ui/management';
import { CoreStart } from 'kibana/public';

export interface AppPlugins {
  management: {
    sections: typeof management;
    getSection(): any;
    breadcrumb: any;
  };
}

export interface AppDependencies {
  core: CoreStart;
  plugins: AppPlugins;
}

export function createShim() {
  return {
    pluginsStart: {
      management: {
        getSection: management.getSection.bind(management),
        breadcrumb: MANAGEMENT_BREADCRUMB,
      },
    },
  };
}
