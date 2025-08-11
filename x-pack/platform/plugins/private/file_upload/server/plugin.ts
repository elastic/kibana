/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  DEFAULT_APP_CATEGORIES,
  type CoreSetup,
  type CoreStart,
  type Logger,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import {
  UI_SETTING_MAX_FILE_SIZE,
  MAX_FILE_SIZE,
  PLUGIN_ID,
} from '@kbn/file-upload-common/src/constants';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';
import { fileUploadRoutes } from './routes';
import { initFileUploadTelemetry } from './telemetry';
import { setupCapabilities } from './capabilities';
import type { StartDeps, SetupDeps } from './types';

export class FileUploadPlugin implements Plugin {
  private readonly _logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this._logger = initializerContext.logger.get();
  }

  setup(coreSetup: CoreSetup<StartDeps, unknown>, plugins: SetupDeps) {
    fileUploadRoutes(coreSetup, this._logger);

    setupCapabilities(coreSetup);

    plugins.features.registerKibanaFeature({
      id: PLUGIN_ID,
      name: i18n.translate('xpack.fileUpload.featureName', {
        defaultMessage: 'File Upload',
      }),
      category: DEFAULT_APP_CATEGORIES.management,
      scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
      app: ['kibana', PLUGIN_ID],
      catalogue: [PLUGIN_ID],
      privilegesTooltip: i18n.translate('xpack.fileUpload.privilegesTooltip', {
        defaultMessage:
          'Grants access to the File Upload tool in the Machine Learning and the Add Data UI.',
      }),
      privileges: {
        all: {
          app: ['kibana', PLUGIN_ID],
          api: [],
          catalogue: [PLUGIN_ID],
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['show'],
        },
        read: {
          disabled: true,
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
      },
    });

    coreSetup.uiSettings.register({
      [UI_SETTING_MAX_FILE_SIZE]: {
        name: i18n.translate('xpack.fileUpload.maxFileSizeUiSetting.name', {
          defaultMessage: 'Maximum file upload size',
        }),
        value: MAX_FILE_SIZE,
        description: i18n.translate('xpack.fileUpload.maxFileSizeUiSetting.description', {
          defaultMessage:
            'Sets the file size limit when importing files. The highest supported value for this setting is 1GB.',
        }),
        schema: schema.string({
          validate: (value) => {
            if (!/^\d+[mg][b]$/i.test(value)) {
              return i18n.translate('xpack.fileUpload.maxFileSizeUiSetting.error', {
                defaultMessage: 'Should be a valid data size. e.g. 200MB, 1GB',
              });
            }
          },
        }),
      },
    });

    initFileUploadTelemetry(coreSetup, plugins.usageCollection);
  }

  start(core: CoreStart) {}
}
