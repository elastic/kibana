/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreStart } from 'src/core/public';
// @ts-ignore
import { JsonUploadAndParse } from './components/json_upload_and_parse';
// @ts-ignore
import { initServicesAndConstants } from './kibana_services';

/**
 * These are the interfaces with your public contracts. You should export these
 * for other plugins to use in _their_ `SetupDeps`/`StartDeps` interfaces.
 * @public
 */
export type FileUploadPluginSetup = ReturnType<FileUploadPlugin['setup']>;
export type FileUploadPluginStart = ReturnType<FileUploadPlugin['start']>;

/** @internal */
export class FileUploadPlugin implements Plugin<FileUploadPluginSetup, FileUploadPluginStart> {
  public setup() {}

  public start(core: CoreStart) {
    initServicesAndConstants(core);
    return {
      JsonUploadAndParse,
    };
  }
}
