/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ManagementSetup } from 'src/legacy/core_plugins/management/public';
import { CopyToSpaceSavedObjectsManagementAction } from './copy_saved_objects_to_space_action';
import { SpacesManager } from '../spaces_manager';

interface SetupDeps {
  spacesManager: SpacesManager;
  managementSetup: ManagementSetup;
}

export class CopySavedObjectsToSpaceService {
  public setup({ spacesManager, managementSetup }: SetupDeps) {
    const action = new CopyToSpaceSavedObjectsManagementAction(spacesManager);
    if (!managementSetup.savedObjects.registry.has(action.id)) {
      managementSetup.savedObjects.registry.register(action);
    }
  }
}
