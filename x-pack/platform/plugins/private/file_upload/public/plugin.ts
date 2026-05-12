/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { registerFileUploadAnalyticsEvents } from '@kbn/file-upload-common/src/telemetry/register_telemetry';
import type { FileUploadPluginStartApi } from './api';
import {
  FileUploadComponent,
  importerFactory,
  hasImportPermission,
  IndexNameFormComponent,
  checkIndexExists,
  getTimeFieldRange,
  analyzeFile,
  previewTikaFile,
  isIndexSearchable,
} from './api';
import { setStartServices } from './kibana_services';
import {
  getMaxBytes,
  getMaxBytesFormatted,
  getMaxTikaBytes,
  getMaxTikaBytesFormatted,
} from './importer/get_max_bytes';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FileUploadPluginSetupDependencies {}
export interface FileUploadPluginStartDependencies {
  data: DataPublicPluginStart;
}

export type FileUploadPluginSetup = ReturnType<FileUploadPlugin['setup']>;
export type FileUploadPluginStart = ReturnType<FileUploadPlugin['start']>;

export class FileUploadPlugin
  implements
    Plugin<
      FileUploadPluginSetup,
      FileUploadPluginStart,
      FileUploadPluginSetupDependencies,
      FileUploadPluginStartDependencies
    >
{
  public setup(core: CoreSetup) {
    registerFileUploadAnalyticsEvents(core.analytics);
  }

  public start(
    core: CoreStart,
    plugins: FileUploadPluginStartDependencies
  ): FileUploadPluginStartApi {
    setStartServices(core, plugins);
    return {
      FileUploadComponent,
      IndexNameFormComponent,
      importerFactory,
      getMaxBytes,
      getMaxBytesFormatted,
      getMaxTikaBytes,
      getMaxTikaBytesFormatted,
      hasImportPermission,
      checkIndexExists,
      getTimeFieldRange,
      analyzeFile,
      previewTikaFile,
      isIndexSearchable,
    };
  }
}
