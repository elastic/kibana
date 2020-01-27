/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { i18n } from '@kbn/i18n';
import { Legacy } from 'kibana';
import { PLUGIN_ID, UI_SETTINGS_CUSTOM_PDF_LOGO } from './common/constants';
import { ReportingConfigOptions, ReportingPluginSpecOptions } from './types.d';
import { config as reportingConfig } from './config';
import {
  LegacySetup,
  ReportingPlugin,
  ReportingSetupDeps,
  reportingPluginFactory,
} from './server/plugin';

const kbToBase64Length = (kb: number) => {
  return Math.floor((kb * 1024 * 8) / 6);
};

export const reporting = (kibana: any) => {
  return new kibana.Plugin({
    id: PLUGIN_ID,
    configPrefix: 'xpack.reporting',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    config: reportingConfig,

    uiExports: {
      shareContextMenuExtensions: [
        'plugins/reporting/share_context_menu/register_csv_reporting',
        'plugins/reporting/share_context_menu/register_reporting',
      ],
      embeddableActions: ['plugins/reporting/panel_actions/get_csv_panel_action'],
      home: ['plugins/reporting/register_feature'],
      managementSections: ['plugins/reporting/views/management'],
      injectDefaultVars(server: Legacy.Server, options?: ReportingConfigOptions) {
        const config = server.config();
        return {
          reportingPollConfig: options ? options.poll : {},
          enablePanelActionDownload: config.get('xpack.reporting.csv.enablePanelActionDownload'),
        };
      },
      uiSettingDefaults: {
        [UI_SETTINGS_CUSTOM_PDF_LOGO]: {
          name: i18n.translate('xpack.reporting.pdfFooterImageLabel', {
            defaultMessage: 'PDF footer image',
          }),
          value: null,
          description: i18n.translate('xpack.reporting.pdfFooterImageDescription', {
            defaultMessage: `Custom image to use in the PDF's footer`,
          }),
          type: 'image',
          validation: {
            maxSize: {
              length: kbToBase64Length(200),
              description: '200 kB',
            },
          },
          category: [PLUGIN_ID],
        },
      },
    },

    async init(server: Legacy.Server) {
      const coreSetup = server.newPlatform.setup.core;
      const pluginsSetup: ReportingSetupDeps = {
        usageCollection: server.newPlatform.setup.plugins.usageCollection,
      };
      const __LEGACY: LegacySetup = {
        config: server.config,
        info: server.info,
        route: server.route.bind(server),
        plugins: {
          elasticsearch: server.plugins.elasticsearch,
          xpack_main: server.plugins.xpack_main,
          security: server.plugins.security,
        },
        savedObjects: server.savedObjects,
        uiSettingsServiceFactory: server.uiSettingsServiceFactory,
        // @ts-ignore Property 'fieldFormatServiceFactory' does not exist on type 'Server'.
        fieldFormatServiceFactory: server.fieldFormatServiceFactory,
      };

      const initializerContext = server.newPlatform.coreContext;
      const plugin: ReportingPlugin = reportingPluginFactory(initializerContext, __LEGACY, this);
      await plugin.setup(coreSetup, pluginsSetup);
    },

    deprecations({ unused }: any) {
      return [
        unused('capture.concurrency'),
        unused('capture.timeout'),
        unused('capture.settleTime'),
        unused('kibanaApp'),
      ];
    },
  } as ReportingPluginSpecOptions);
};
