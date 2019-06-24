/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './saved_gis_map';
import { uiModules } from 'ui/modules';
import { SavedObjectLoader, SavedObjectsClientProvider } from 'ui/saved_objects';

const module = uiModules.get('app/maps');

// This is the only thing that gets injected into controllers
module.service('gisMapSavedObjectLoader', function (Private, SavedGisMap, kbnUrl, chrome) {
  const savedObjectClient = Private(SavedObjectsClientProvider);
  return new SavedObjectLoader(SavedGisMap, kbnUrl, chrome, savedObjectClient);
});
