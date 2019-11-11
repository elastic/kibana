/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup, CoreStart } from 'src/core/public';
// @ts-ignore
import { initResources } from './util/indexing_service';

/**
 * These are the interfaces with your public contracts. You should export these
 * for other plugins to use in _their_ `SetupDeps`/`StartDeps` interfaces.
 * @public
 */
export type FileUploadPluginSetup = ReturnType<FileUploadPlugin['setup']>;
export type FileUploadPluginStart = ReturnType<FileUploadPlugin['start']>;

/** @internal */
export class FileUploadPlugin implements Plugin<FileUploadPluginSetup, FileUploadPluginStart> {
  public setup(core: CoreSetup) {
    // kick off your plugin here...
    // const { i18n, routing, http, savedObjects, chrome, notification, documentation, docTitle } = core;
    // const fileUploadBasePath = chrome.addBasePath('/api/fileupload');
    // const apiBasePath = chrome.addBasePath('/api');
  }

  public start(core: CoreStart) {
    const { savedObjects } = core;
    initResources(savedObjects.client);
    // // ...or here
    // return {
    //   initDemo: () => ({}),
    // };
  }
}
