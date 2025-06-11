/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const serviceParamValueToKbnSettingMap = {
  gmail: 'google-mail',
  outlook365: 'microsoft-outlook',
  ses: 'amazon-ses',
  elastic_cloud: 'elastic-cloud',
  exchange_server: 'microsoft-exchange',
  other: 'other',
} as const;
