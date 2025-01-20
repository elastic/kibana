/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { fileUploadRoutes } from './routes';
import { initFileUploadTelemetry } from './telemetry';
import { MAX_FILE_SIZE, UI_SETTING_MAX_FILE_SIZE } from '../common/constants';
import { setupCapabilities } from './capabilities';
import { StartDeps, SetupDeps } from './types';

export class FileUploadPlugin implements Plugin {
  private readonly _logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this._logger = initializerContext.logger.get();
  }

  setup(coreSetup: CoreSetup<StartDeps, unknown>, plugins: SetupDeps) {
    fileUploadRoutes(coreSetup, this._logger);

    setupCapabilities(coreSetup);

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
