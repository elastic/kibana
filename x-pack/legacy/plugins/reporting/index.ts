/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Legacy } from 'kibana';
import { resolve } from 'path';
import { PLUGIN_ID, UI_SETTINGS_CUSTOM_PDF_LOGO } from './common/constants';
import { config as reportingConfig } from './config';
import { legacyInit } from './server/legacy';
import { ReportingConfigOptions, ReportingPluginSpecOptions } from './types';

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
      return legacyInit(server, this);
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
