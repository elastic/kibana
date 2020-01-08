/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { i18n } from '@kbn/i18n';
import { PLUGIN_ID, UI_SETTINGS_CUSTOM_PDF_LOGO } from './common/constants';
// @ts-ignore untyped module defintition
import { mirrorPluginStatus } from '../../server/lib/mirror_plugin_status';
import { registerRoutes } from './server/routes';
import {
  LevelLogger,
  checkLicenseFactory,
  getExportTypesRegistry,
  runValidations,
} from './server/lib';
import { config as reportingConfig } from './config';
import { logConfiguration } from './log_configuration';
import { createBrowserDriverFactory } from './server/browsers';
import { registerReportingUsageCollector } from './server/usage';
import { ReportingConfigOptions, ReportingPluginSpecOptions, ServerFacade } from './types.d';

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
      injectDefaultVars(server: ServerFacade, options?: ReportingConfigOptions) {
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
          options: {
            maxSize: {
              length: kbToBase64Length(200),
              description: '200 kB',
            },
          },
          category: [PLUGIN_ID],
        },
      },
    },

    // TODO: Decouple Hapi: Build a server facade object based on the server to
    // pass through to the libs. Do not pass server directly
    async init(server: ServerFacade) {
      const exportTypesRegistry = getExportTypesRegistry();

      let isCollectorReady = false;
      // Register a function with server to manage the collection of usage stats
      const { usageCollection } = server.newPlatform.setup.plugins;
      registerReportingUsageCollector(
        usageCollection,
        server,
        () => isCollectorReady,
        exportTypesRegistry
      );

      const logger = LevelLogger.createForServer(server, [PLUGIN_ID]);
      const browserDriverFactory = await createBrowserDriverFactory(server);

      logConfiguration(server, logger);
      runValidations(server, logger, browserDriverFactory);

      const { xpack_main: xpackMainPlugin } = server.plugins;
      mirrorPluginStatus(xpackMainPlugin, this);
      const checkLicense = checkLicenseFactory(exportTypesRegistry);
      (xpackMainPlugin as any).status.once('green', () => {
        // Register a function that is called whenever the xpack info changes,
        // to re-compute the license check results for this plugin
        xpackMainPlugin.info.feature(this.id).registerLicenseCheckResultsGenerator(checkLicense);
      });

      // Post initialization of the above code, the collector is now ready to fetch its data
      isCollectorReady = true;

      // Reporting routes
      registerRoutes(server, exportTypesRegistry, browserDriverFactory, logger);
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
