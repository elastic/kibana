/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { resolve } from 'path';
import {
  MONITORING_CONFIG_ALERTING_EMAIL_ADDRESS,
  KIBANA_ALERTING_ENABLED,
} from './common/constants';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/utils';

/**
 * Configuration of dependency objects for the UI, which are needed for the
 * Monitoring UI app and views and data for outside the monitoring
 * app (injectDefaultVars and hacks)
 * @return {Object} data per Kibana plugin uiExport schema
 */
export const getUiExports = () => {
  const uiSettingDefaults = {};
  if (KIBANA_ALERTING_ENABLED) {
    uiSettingDefaults[MONITORING_CONFIG_ALERTING_EMAIL_ADDRESS] = {
      name: i18n.translate('xpack.monitoring.alertingEmailAddress.name', {
        defaultMessage: 'Alerting email address',
      }),
      value: '',
      description: i18n.translate('xpack.monitoring.alertingEmailAddress.description', {
        defaultMessage: `The default email address to receive alerts from Stack Monitoring`,
      }),
      category: ['monitoring'],
    };
  }

  return {
    app: {
      title: i18n.translate('xpack.monitoring.stackMonitoringTitle', {
        defaultMessage: 'Stack Monitoring',
      }),
      order: 9002,
      description: i18n.translate('xpack.monitoring.uiExportsDescription', {
        defaultMessage: 'Monitoring for Elastic Stack',
      }),
      icon: 'plugins/monitoring/icons/monitoring.svg',
      euiIconType: 'monitoringApp',
      linkToLastSubUrl: false,
      main: 'plugins/monitoring/legacy',
      category: DEFAULT_APP_CATEGORIES.management,
    },
    injectDefaultVars(server) {
      const config = server.config();
      return {
        monitoringUiEnabled: config.get('monitoring.ui.enabled'),
        monitoringLegacyEmailAddress: config.get(
          'monitoring.cluster_alerts.email_notifications.email_address'
        ),
      };
    },
    uiSettingDefaults,
    hacks: ['plugins/monitoring/hacks/toggle_app_link_in_nav'],
    home: ['plugins/monitoring/register_feature'],
    styleSheetPaths: resolve(__dirname, 'public/index.scss'),
  };
};
