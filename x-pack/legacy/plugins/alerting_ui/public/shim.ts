/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { management, MANAGEMENT_BREADCRUMB } from 'ui/management';
import { capabilities } from 'ui/capabilities';
import { CoreStart } from 'kibana/public';
import { toastNotifications } from 'ui/notify';
import { docTitle } from 'ui/doc_title/doc_title';

export interface AppPlugins {
  management: {
    breadcrumb: typeof MANAGEMENT_BREADCRUMB;
  };
  capabilities: typeof capabilities;
  toastNotifications: typeof toastNotifications;
  docTitle: typeof docTitle;
}

export interface AppDependencies {
  core: CoreStart;
  plugins: AppPlugins;
}

export function createShim() {
  return {
    pluginsSetup: {
      capabilities,
      management: {
        getSection: management.getSection.bind(management),
      },
    },
    pluginsStart: {
      docTitle,
      capabilities,
      toastNotifications,
      management: {
        breadcrumb: MANAGEMENT_BREADCRUMB,
      },
    },
  };
}
