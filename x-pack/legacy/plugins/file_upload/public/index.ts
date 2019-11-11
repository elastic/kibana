/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializer } from 'src/core/server';
import { FileUploadPlugin, FileUploadPluginSetup, FileUploadPluginStart } from './plugin';
// @ts-ignore
import { JsonUploadAndParse } from './components/json_upload_and_parse';

export const plugin: PluginInitializer<FileUploadPluginSetup, FileUploadPluginStart> = () =>
  new FileUploadPlugin();

export { JsonUploadAndParse };
