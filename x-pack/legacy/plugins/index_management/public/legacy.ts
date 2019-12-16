/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { MANAGEMENT_BREADCRUMB } from 'ui/management';
import { npStart } from 'ui/new_platform';
import { createUiStatsReporter } from '../../../../../src/legacy/core_plugins/ui_metric/public';

export interface LegacyStart {
  management: {
    getSection: typeof npStart.plugins.management.legacy.getSection;
    constants: {
      BREADCRUMB: typeof MANAGEMENT_BREADCRUMB;
    };
  };
  uiMetric: {
    createUiStatsReporter: typeof createUiStatsReporter;
  };
}

export const __LEGACYStart = {
  management: {
    getSection: npStart.plugins.management.legacy.getSection.bind(
      npStart.plugins.management.legacy
    ),
    constants: {
      BREADCRUMB: MANAGEMENT_BREADCRUMB,
    },
  },
  uiMetric: {
    createUiStatsReporter,
  },
};
