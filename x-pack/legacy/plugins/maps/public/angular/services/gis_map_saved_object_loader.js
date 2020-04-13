/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSavedGisMapClass } from './saved_gis_map';
import { uiModules } from 'ui/modules';
import { SavedObjectLoader } from '../../../../../../../src/plugins/saved_objects/public';
import {
  getCoreChrome,
  getSavedObjectsClient,
  getIndexPatternService,
  getCoreOverlays,
  getData,
} from '../../kibana_services';

export function getMapsSavedObjectLoader() {
  const services = {
    savedObjectsClient: getSavedObjectsClient(),
    indexPatterns: getIndexPatternService(),
    search: getData().search,
    chrome: getCoreChrome(),
    overlays: getCoreOverlays(),
  };
  const SavedGisMap = createSavedGisMapClass(services);

  return new SavedObjectLoader(SavedGisMap, getSavedObjectsClient(), getCoreChrome());
}

const module = uiModules.get('app/maps');

// This is the only thing that gets injected into controllers
module.service('gisMapSavedObjectLoader', function() {
  return getMapsSavedObjectLoader();
});
