/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core/public';
import type { PluginStartContract as AlertingPublicStart } from '@kbn/alerting-plugin/public/plugin';

export const getAlertingCapabilities = (
  alerting: AlertingPublicStart | undefined,
  capabilities: Capabilities
) => {
  const canSaveAlerts = !!capabilities.dataQuality['alerting:save'];
  const isAlertingPluginEnabled = !!alerting;
  const isAlertingAvailable = isAlertingPluginEnabled && canSaveAlerts;

  return {
    isAlertingAvailable,
  };
};
