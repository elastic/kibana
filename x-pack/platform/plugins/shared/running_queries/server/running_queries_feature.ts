/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import {
  RUNNING_QUERIES_READ_PRIVILEGE,
  RUNNING_QUERIES_WRITE_PRIVILEGE,
} from '../common/constants';

export const RUNNING_QUERIES_FEATURE_ID = 'running_queries';

export const runningQueriesFeature: KibanaFeatureConfig = {
  id: RUNNING_QUERIES_FEATURE_ID,
  name: i18n.translate('xpack.runningQueries.feature.featureName', {
    defaultMessage: 'Running Queries',
  }),
  category: DEFAULT_APP_CATEGORIES.management,
  app: [],
  management: {
    insightsAndAlerting: ['running_queries'],
  },
  privileges: {
    all: {
      app: [],
      api: [RUNNING_QUERIES_READ_PRIVILEGE, RUNNING_QUERIES_WRITE_PRIVILEGE],
      management: {
        insightsAndAlerting: ['running_queries'],
      },
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['show', 'save'],
    },
    read: {
      app: [],
      api: [RUNNING_QUERIES_READ_PRIVILEGE],
      management: {
        insightsAndAlerting: ['running_queries'],
      },
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['show'],
    },
  },
};
