/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { resolve } from 'path';
import { Server } from 'hapi';

import { Legacy } from 'kibana';
import { initServerWithKibana } from './server/kibana.index';
import { savedObjectMappings } from './server/saved_objects';

import {
  APP_ID,
  APP_NAME,
  DEFAULT_INDEX_KEY,
  DEFAULT_ANOMALY_SCORE,
  DEFAULT_SIEM_TIME_RANGE,
  DEFAULT_SIEM_REFRESH_INTERVAL,
  DEFAULT_INTERVAL_PAUSE,
  DEFAULT_INTERVAL_VALUE,
  DEFAULT_FROM,
  DEFAULT_TO,
} from './common/constants';
import {
  alwaysFiringAlertType,
  rateLimitedActionType,
} from './server/lib/detection_engine/alerts/always_firing';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function siem(kibana: any) {
  return new kibana.Plugin({
    id: APP_ID,
    configPrefix: 'xpack.siem',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'alerting', 'actions'],
    uiExports: {
      app: {
        description: i18n.translate('xpack.siem.securityDescription', {
          defaultMessage: 'Explore your SIEM App',
        }),
        main: 'plugins/siem/app',
        euiIconType: 'securityAnalyticsApp',
        title: APP_NAME,
        listed: false,
        url: `/app/${APP_ID}`,
      },
      home: ['plugins/siem/register_feature'],
      links: [
        {
          description: i18n.translate('xpack.siem.linkSecurityDescription', {
            defaultMessage: 'Explore your SIEM App',
          }),
          euiIconType: 'securityAnalyticsApp',
          id: 'siem',
          order: 9000,
          title: APP_NAME,
          url: `/app/${APP_ID}`,
        },
      ],
      uiSettingDefaults: {
        [DEFAULT_SIEM_REFRESH_INTERVAL]: {
          type: 'json',
          name: i18n.translate('xpack.siem.uiSettings.defaultRefreshIntervalLabel', {
            defaultMessage: 'Time picker refresh interval',
          }),
          value: `{
  "pause": ${DEFAULT_INTERVAL_PAUSE},
  "value": ${DEFAULT_INTERVAL_VALUE}
}`,
          description: i18n.translate('xpack.siem.uiSettings.defaultRefreshIntervalDescription', {
            defaultMessage: "The SIEM timefilter's default refresh interval",
          }),
          category: ['siem'],
          requiresPageReload: true,
        },
        [DEFAULT_SIEM_TIME_RANGE]: {
          type: 'json',
          name: i18n.translate('xpack.siem.uiSettings.defaultTimeRangeLabel', {
            defaultMessage: 'Time picker defaults',
          }),
          value: `{
  "from": "${DEFAULT_FROM}",
  "to": "${DEFAULT_TO}"
}`,
          description: i18n.translate('xpack.siem.uiSettings.defaultTimeRangeDescription', {
            defaultMessage:
              'The SIEM timefilter selection to use when Kibana is started without one',
          }),
          category: ['siem'],
          requiresPageReload: true,
        },
        [DEFAULT_INDEX_KEY]: {
          name: i18n.translate('xpack.siem.uiSettings.defaultIndexLabel', {
            defaultMessage: 'Default index',
          }),
          value: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
          description: i18n.translate('xpack.siem.uiSettings.defaultIndexDescription', {
            defaultMessage: 'Default Elasticsearch index to search',
          }),
          category: ['siem'],
          requiresPageReload: true,
        },
        [DEFAULT_ANOMALY_SCORE]: {
          name: i18n.translate('xpack.siem.uiSettings.defaultAnomalyScoreLabel', {
            defaultMessage: 'Default anomaly threshold',
          }),
          value: 50,
          type: 'number',
          description: i18n.translate('xpack.siem.uiSettings.defaultAnomalyScoreDescription', {
            defaultMessage:
              'Default anomaly score threshold to exceed before showing anomalies. Valid values are between 0 and 100',
          }),
          category: ['siem'],
          requiresPageReload: true,
        },
      },
      mappings: savedObjectMappings,
    },
    isEnabled(config: Legacy.KibanaConfig) {
      return config.get('xpack.alerting.enabled') && config.get('xpack.actions.enabled');
    },
    init(server: Server) {
      if (server.plugins.alerting != null) {
        console.log('...I have found alerting and should be ok to run...');
        server.plugins.alerting.registerType(alwaysFiringAlertType);
      }
      if (server.plugins.actions != null) {
        console.log('...I have found actions and should be ok to run...');
        server.plugins.actions.registerType(rateLimitedActionType);
      }
      server.injectUiAppVars('siem', async () => server.getInjectedUiAppVars('kibana'));
      initServerWithKibana(server);
    },
  });
}
