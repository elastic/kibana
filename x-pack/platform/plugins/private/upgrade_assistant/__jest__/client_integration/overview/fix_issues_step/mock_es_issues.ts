/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESUpgradeStatus } from '../../../../common/types';

export const esCriticalAndWarningDeprecations: ESUpgradeStatus = {
  totalCriticalDeprecations: 1,
  migrationsDeprecations: [
    {
      isCritical: true,
      type: 'cluster_settings',
      resolveDuringUpgrade: false,
      message: 'Index Lifecycle Management poll interval is set too low',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking-changes-8.0.html#ilm-poll-interval-limit',
      details:
        'The Index Lifecycle Management poll interval setting [indices.lifecycle.poll_interval] is currently set to [500ms], but must be 1s or greater',
    },
    {
      isCritical: false,
      type: 'index_settings',
      resolveDuringUpgrade: false,
      message: 'Setting [index.routing.allocation.include._tier] is deprecated',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/7.16/migrating-7.13.html#deprecate-tier-filter-setting',
      details:
        'Remove the [index.routing.allocation.include._tier] setting. Use [index.routing.allocation.include._tier_preference] to control allocation to data tiers.',
      index: 'settings',
      correctiveAction: {
        type: 'indexSetting',
        deprecatedSettings: ['index.routing.allocation.include._tier'],
      },
    },
  ],
  totalCriticalHealthIssues: 0,
  enrichedHealthIndicators: [],
};

export const esCriticalOnlyDeprecations: ESUpgradeStatus = {
  totalCriticalDeprecations: 1,
  migrationsDeprecations: [
    {
      isCritical: true,
      type: 'cluster_settings',
      resolveDuringUpgrade: false,
      message: 'Index Lifecycle Management poll interval is set too low',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking-changes-8.0.html#ilm-poll-interval-limit',
      details:
        'The Index Lifecycle Management poll interval setting [indices.lifecycle.poll_interval] is currently set to [500ms], but must be 1s or greater',
    },
  ],
  totalCriticalHealthIssues: 0,
  enrichedHealthIndicators: [],
};

export const esNoDeprecations: ESUpgradeStatus = {
  totalCriticalDeprecations: 0,
  migrationsDeprecations: [],
  totalCriticalHealthIssues: 0,
  enrichedHealthIndicators: [],
};
