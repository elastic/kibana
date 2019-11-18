/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { resolve } from 'path';
import { Server } from 'hapi';

import { PluginInitializerContext } from 'src/core/server';
import { plugin } from './server';
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
import { defaultIndexPattern } from './default_index_pattern';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const siem = (kibana: any) => {
  return new kibana.Plugin({
    id: APP_ID,
    configPrefix: 'xpack.siem',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch'],
    // Uncomment these lines to turn on alerting and action for detection engine and comment the other
    // require statement out. These are hidden behind feature flags at the moment so if you turn
    // these on without the feature flags turned on then Kibana will crash since we are a legacy plugin
    // and legacy plugins cannot have optional requirements.
    // require: ['kibana', 'elasticsearch', 'alerting', 'actions'],
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
            defaultMessage: 'Time filter refresh interval',
          }),
          value: `{
  "pause": ${DEFAULT_INTERVAL_PAUSE},
  "value": ${DEFAULT_INTERVAL_VALUE}
}`,
          description: i18n.translate('xpack.siem.uiSettings.defaultRefreshIntervalDescription', {
            defaultMessage:
              '<p>Default refresh interval for the SIEM time filter, in milliseconds.</p>',
          }),
          category: ['siem'],
          requiresPageReload: true,
        },
        [DEFAULT_SIEM_TIME_RANGE]: {
          type: 'json',
          name: i18n.translate('xpack.siem.uiSettings.defaultTimeRangeLabel', {
            defaultMessage: 'Time filter period',
          }),
          value: `{
  "from": "${DEFAULT_FROM}",
  "to": "${DEFAULT_TO}"
}`,
          description: i18n.translate('xpack.siem.uiSettings.defaultTimeRangeDescription', {
            defaultMessage: '<p>Default period of time in the SIEM time filter.</p>',
          }),
          category: ['siem'],
          requiresPageReload: true,
        },
        [DEFAULT_INDEX_KEY]: {
          name: i18n.translate('xpack.siem.uiSettings.defaultIndexLabel', {
            defaultMessage: 'Elasticsearch indices',
          }),
          value: defaultIndexPattern,
          description: i18n.translate('xpack.siem.uiSettings.defaultIndexDescription', {
            defaultMessage:
              '<p>Comma-delimited list of Elasticsearch indices from which the SIEM app collects events.</p>',
          }),
          category: ['siem'],
          requiresPageReload: true,
        },
        [DEFAULT_ANOMALY_SCORE]: {
          name: i18n.translate('xpack.siem.uiSettings.defaultAnomalyScoreLabel', {
            defaultMessage: 'Anomaly threshold',
          }),
          value: 50,
          type: 'number',
          description: i18n.translate('xpack.siem.uiSettings.defaultAnomalyScoreDescription', {
            defaultMessage:
              '<p>Value above which Machine Learning job anomalies are displayed in the SIEM app.</p><p>Valid values: 0 to 100.</p>',
          }),
          category: ['siem'],
          requiresPageReload: true,
        },
      },
      mappings: savedObjectMappings,
    },
    init(server: Server) {
      const {
        config,
        getInjectedUiAppVars,
        indexPatternsServiceFactory,
        injectUiAppVars,
        newPlatform,
        plugins,
        route,
        savedObjects,
      } = server;

      const {
        env,
        coreContext: { logger },
        setup,
      } = newPlatform;
      const initializerContext = { logger, env };

      const serverFacade = {
        config,
        getInjectedUiAppVars,
        indexPatternsServiceFactory,
        injectUiAppVars,
        plugins: { alerting: plugins.alerting, xpack_main: plugins.xpack_main },
        route: route.bind(server),
        savedObjects,
      };

      plugin(initializerContext as PluginInitializerContext).setup(
        setup.core,
        setup.plugins,
        serverFacade
      );
    },
  });
};
