/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

// Remote Clusters UI needs ES cluster `manage` (read/write remote settings) + Kibana management.
export const REMOTE_CLUSTERS_ADMIN_ROLE: KibanaRole = {
  elasticsearch: { cluster: ['manage'] },
  kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
};

// EuiFlyout renders in a portal outside `.kbnAppWrapper`, so both selectors are
// required to catch a11y violations inside the detail/request flyouts.
export const A11Y_SELECTORS = ['.kbnAppWrapper', '[data-euiportal="true"]'];

export const SNIFF_CLUSTER_NAME = 'clusterSniffMode';
export const PROXY_CLUSTER_NAME = 'clusterProxyMode';
