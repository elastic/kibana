/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart, npSetup } from 'ui/new_platform';
import { management, MANAGEMENT_BREADCRUMB } from 'ui/management';
import { fatalError } from 'ui/notify';
import { DOC_LINK_VERSION, ELASTIC_WEBSITE_URL } from 'ui/documentation_links';

export function createShim() {
  const {
    core: { chrome, i18n, notifications, http, injectedMetadata },
  } = npStart;

  return {
    coreSetup: {
      plugins: {
        metrics: npSetup.plugins.metrics,
      },
    },
    coreStart: {
      chrome,
      i18n,
      notifications,
      fatalError,
      injectedMetadata,
      http,
      documentation: {
        elasticWebsiteUrl: ELASTIC_WEBSITE_URL,
        docLinkVersion: DOC_LINK_VERSION,
      },
    },
    pluginsStart: {
      management: {
        getSection: management.getSection.bind(management),
        breadcrumb: MANAGEMENT_BREADCRUMB,
      },
    },
  };
}
