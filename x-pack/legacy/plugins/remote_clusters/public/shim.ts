/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart } from 'ui/new_platform';
import { MANAGEMENT_BREADCRUMB } from 'ui/management';
import { fatalError } from 'ui/notify';
import { DOC_LINK_VERSION, ELASTIC_WEBSITE_URL } from 'ui/documentation_links';

import { createUiStatsReporter } from '../../../../../src/legacy/core_plugins/ui_metric/public';

export function createShim() {
  const {
    core: { chrome, i18n, notifications, http, injectedMetadata },
  } = npStart;

  return {
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
        getSection: npStart.plugins.management.legacy.getSection.bind(
          npStart.plugins.management.legacy
        ),
        breadcrumb: MANAGEMENT_BREADCRUMB,
      },
      uiMetric: {
        createUiStatsReporter,
      },
    },
  };
}
