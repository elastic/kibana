/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { QUERY_ACTIVITY_READ_PRIVILEGE, QUERY_ACTIVITY_WRITE_PRIVILEGE } from '../common/constants';

export const QUERY_ACTIVITY_FEATURE_ID = 'queryActivity';

export const queryActivityFeature: KibanaFeatureConfig = {
  id: QUERY_ACTIVITY_FEATURE_ID,
  name: i18n.translate('xpack.queryActivity.feature.featureName', {
    defaultMessage: 'Query activity',
  }),
  privilegesTooltip: i18n.translate('xpack.queryActivity.feature.privilegesTooltip', {
    defaultMessage:
      'Granting this feature privilege shows the Query activity navigation option, but cluster privileges (cluster:monitor or cluster:manage) are also required to access the page.',
  }),
  category: DEFAULT_APP_CATEGORIES.management,
  app: [],
  management: {
    clusterPerformance: ['queryActivity'],
  },
  privileges: {
    all: {
      app: [],
      api: [QUERY_ACTIVITY_READ_PRIVILEGE, QUERY_ACTIVITY_WRITE_PRIVILEGE],
      management: {
        clusterPerformance: ['queryActivity'],
      },
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['show', 'save'],
    },
    read: {
      app: [],
      api: [QUERY_ACTIVITY_READ_PRIVILEGE],
      management: {
        clusterPerformance: ['queryActivity'],
      },
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['show'],
    },
  },
};
