/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsManagementAction } from 'src/legacy/core_plugins/management/public';
import { npSetup } from 'ui/new_platform';
import routes from 'ui/routes';
import { SpacesPluginSetup } from '../../../../plugins/spaces/public';
import { setup as managementSetup } from '../../../../../src/legacy/core_plugins/management/public/legacy';

const legacyAPI = {
  registerSavedObjectsManagementAction: (action: SavedObjectsManagementAction) => {
    managementSetup.savedObjects.registry.register(action);
  },
};

const spaces = (npSetup.plugins as any).spaces as SpacesPluginSetup;
if (spaces) {
  spaces.registerLegacyAPI(legacyAPI);

  routes.when('/management/spaces/list', { redirectTo: '/management/kibana/spaces' });
  routes.when('/management/spaces/create', { redirectTo: '/management/kibana/spaces/create' });
  routes.when('/management/spaces/edit/:spaceId', {
    redirectTo: '/management/kibana/spaces/edit/:spaceId',
  });
}
