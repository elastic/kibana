/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSavedGisMapClass } from './saved_gis_map';
import { uiModules } from 'ui/modules';
import { SavedObjectLoader } from '../../../../../../../src/plugins/saved_objects/public';
import { npStart } from '../../../../../../../src/legacy/ui/public/new_platform';

const module = uiModules.get('app/maps');

// This is the only thing that gets injected into controllers
module.service('gisMapSavedObjectLoader', function() {
  const savedObjectsClient = npStart.core.savedObjects.client;
  const services = {
    savedObjectsClient,
    indexPatterns: npStart.plugins.data.indexPatterns,
    search: npStart.plugins.data.search,
    chrome: npStart.core.chrome,
    overlays: npStart.core.overlays,
  };
  const SavedGisMap = createSavedGisMapClass(services);

  return new SavedObjectLoader(SavedGisMap, npStart.core.savedObjects.client, npStart.core.chrome);
});
