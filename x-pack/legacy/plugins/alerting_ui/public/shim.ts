/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { management, MANAGEMENT_BREADCRUMB } from 'ui/management';
import { CoreStart } from 'kibana/public';
import { ActionTypeRegistry } from '../np_ready/public/application/action_type_registry';

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
  actionTypeRegistry: ActionTypeRegistry;
}

export function createShim() {
  return {
    pluginsSetup: {
      management: {
        getSection: management.getSection.bind(management),
      },
    },
    pluginsStart: {
      management: {
        breadcrumb: MANAGEMENT_BREADCRUMB,
      },
    },
  };
}
