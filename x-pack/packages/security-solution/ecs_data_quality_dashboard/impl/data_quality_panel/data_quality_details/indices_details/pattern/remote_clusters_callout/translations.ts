/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TITLE = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.remoteClustersCallout.title',
  {
    defaultMessage: "Remote clusters won't be checked",
  }
);

export const TO_CHECK_INDICES_ON_REMOTE_CLUSTERS = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.remoteClustersCallout.toCheckIndicesOnRemoteClustersLabel',
  {
    defaultMessage:
      "To check indices on remote clusters supporting cross-cluster search, log in to the remote cluster's Kibana",
  }
);
