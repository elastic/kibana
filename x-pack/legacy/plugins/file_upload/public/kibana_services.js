/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { start as data } from '../../../../../src/legacy/core_plugins/data/public/legacy';

export const indexPatternService = data.indexPatterns.indexPatterns;

export let savedObjectsClient;
export let apiBasePath;

export const initServicesAndConstants = ({ savedObjects, http }) => {
  savedObjectsClient = savedObjects.client;
  apiBasePath = http.basePath.prepend('/api');
};
