/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { FileUploadPluginStartDependencies } from './plugin';

let coreStart: CoreStart;
let pluginsStart: FileUploadPluginStartDependencies;
export function setStartServices(core: CoreStart, plugins: FileUploadPluginStartDependencies) {
  coreStart = core;
  pluginsStart = plugins;
}

export const getDocLinks = () => coreStart.docLinks;
export const getDataViewsService = () => pluginsStart.data.dataViews;
export const getHttp = () => coreStart.http;
export const getUiSettings = () => coreStart.settings.client;
export const getSettings = () => coreStart.settings;
export const getTheme = () => coreStart.theme;
