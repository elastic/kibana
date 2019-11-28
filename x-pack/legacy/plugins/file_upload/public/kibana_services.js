/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { start as data } from '../../../../../src/legacy/core_plugins/data/public/legacy';
import { DEFAULT_KBN_VERSION } from '../common/constants/file_import';

export const indexPatternService = data.indexPatterns.indexPatterns;

export let savedObjectsClient;
export let basePath;
export let apiBasePath;
export let kbnVersion;

export const initServicesAndConstants = ({ savedObjects, http, injectedMetadata }) => {
  savedObjectsClient = savedObjects.client;
  basePath = http.basePath.basePath;
  apiBasePath = http.basePath.prepend('/api');
  kbnVersion = injectedMetadata.getKibanaVersion(DEFAULT_KBN_VERSION);
};
