/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart } from 'ui/new_platform';
import { management, MANAGEMENT_BREADCRUMB } from 'ui/management';

import { createUiStatsReporter } from '../../../../../src/legacy/core_plugins/ui_metric/public';

export function createShim() {
  const {
    core: { chrome, i18n, notifications, http, injectedMetadata, docLinks, fatalErrors },
  } = npStart;

  return {
    coreStart: {
      chrome,
      i18n,
      notifications,
      injectedMetadata,
      http,
      docLinks,
      fatalErrors,
    },
    pluginsStart: {
      management: {
        getSection: management.getSection.bind(management),
        breadcrumb: MANAGEMENT_BREADCRUMB,
      },
      uiMetric: {
        createUiStatsReporter,
      },
    },
  };
}
