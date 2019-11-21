/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { management, MANAGEMENT_BREADCRUMB } from 'ui/management';
import { createUiStatsReporter } from '../../../../../src/legacy/core_plugins/ui_metric/public';

export interface LegacyStart {
  management: {
    getSection: typeof management.getSection;
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
    getSection: management.getSection.bind(management),
    constants: {
      BREADCRUMB: MANAGEMENT_BREADCRUMB,
    },
  },
  uiMetric: {
    createUiStatsReporter,
  },
};
