/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ManagementSetup } from 'src/legacy/core_plugins/management/public';
import { CopyToSpaceSavedObjectsManagementAction } from './copy_saved_objects_to_space_action';
import { spacesManagerMock } from '../spaces_manager/mocks';
import { CopySavedObjectsToSpaceService } from '.';

describe('CopySavedObjectsToSpaceService', () => {
  describe('#setup', () => {
    it('registers the CopyToSpaceSavedObjectsManagementAction', () => {
      const deps = {
        spacesManager: spacesManagerMock.create(),
        // we don't have a proper NP mock for this yet
        managementSetup: ({
          savedObjects: {
            registry: {
              has: jest.fn().mockReturnValue(false),
              register: jest.fn(),
            },
          },
        } as unknown) as ManagementSetup,
      };

      const service = new CopySavedObjectsToSpaceService();
      service.setup(deps);

      expect(deps.managementSetup.savedObjects.registry.register).toHaveBeenCalledTimes(1);
      expect(deps.managementSetup.savedObjects.registry.register).toHaveBeenCalledWith(
        expect.any(CopyToSpaceSavedObjectsManagementAction)
      );
    });

    it('will not re-register the CopyToSpaceSavedObjectsManagementAction', () => {
      const deps = {
        spacesManager: spacesManagerMock.create(),
        // we don't have a proper NP mock for this yet
        managementSetup: ({
          savedObjects: {
            registry: {
              has: jest.fn().mockReturnValue(true),
              register: jest.fn(),
            },
          },
        } as unknown) as ManagementSetup,
      };

      const service = new CopySavedObjectsToSpaceService();
      service.setup(deps);

      expect(deps.managementSetup.savedObjects.registry.register).toHaveBeenCalledTimes(0);
    });
  });
});
