/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './management/legacy_page_routes';

import { SavedObjectsManagementAction } from 'src/legacy/core_plugins/management/public';
import { registerSettingsComponent } from 'ui/management';
import { npSetup } from 'ui/new_platform';
import { SpacesPluginSetup } from '../../../../plugins/spaces/public';
import { setup as managementSetup } from '../../../../../src/legacy/core_plugins/management/public/legacy';

const legacyAPI = {
  registerSavedObjectsManagementAction: (action: SavedObjectsManagementAction) => {
    managementSetup.savedObjects.registry.register(action);
  },
  registerSettingsComponent,
};

((npSetup.plugins as any).spaces as SpacesPluginSetup).registerLegacyAPI(legacyAPI);
