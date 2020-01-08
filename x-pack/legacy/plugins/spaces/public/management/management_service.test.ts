/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ManagementService } from '.';

describe('ManagementService', () => {
  describe('#start', () => {
    it('registers the spaces management page under the kibana section', () => {
      const mockKibanaSection = {
        hasItem: jest.fn().mockReturnValue(false),
        register: jest.fn(),
      };

      const managementStart = {
        legacy: {
          getSection: jest.fn().mockReturnValue(mockKibanaSection),
        },
      };

      const deps = {
        managementStart,
      };

      const service = new ManagementService();
      service.start(deps);

      expect(deps.managementStart.legacy.getSection).toHaveBeenCalledTimes(1);
      expect(deps.managementStart.legacy.getSection).toHaveBeenCalledWith('kibana');

      expect(mockKibanaSection.register).toHaveBeenCalledTimes(1);
      expect(mockKibanaSection.register).toHaveBeenCalledWith('spaces', {
        name: 'spacesManagementLink',
        order: 10,
        display: 'Spaces',
        url: `#/management/spaces/list`,
      });
    });

    it('will not register the spaces management page twice', () => {
      const mockKibanaSection = {
        hasItem: jest.fn().mockReturnValue(true),
        register: jest.fn(),
      };

      const managementStart = {
        legacy: {
          getSection: jest.fn().mockReturnValue(mockKibanaSection),
        },
      };

      const deps = {
        managementStart,
      };

      const service = new ManagementService();
      service.start(deps);

      expect(mockKibanaSection.register).toHaveBeenCalledTimes(0);
    });

    it('will not register the spaces management page if the kibana section is missing', () => {
      const managementStart = {
        legacy: {
          getSection: jest.fn().mockReturnValue(undefined),
        },
      };

      const deps = {
        managementStart,
      };

      const service = new ManagementService();
      service.start(deps);

      expect(deps.managementStart.legacy.getSection).toHaveBeenCalledTimes(1);
    });
  });

  describe('#stop', () => {
    it('deregisters the spaces management page', () => {
      const mockKibanaSection = {
        hasItem: jest
          .fn()
          .mockReturnValueOnce(false)
          .mockReturnValueOnce(true),
        register: jest.fn(),
        deregister: jest.fn(),
      };

      const managementStart = {
        legacy: {
          getSection: jest.fn().mockReturnValue(mockKibanaSection),
        },
      };

      const deps = {
        managementStart,
      };

      const service = new ManagementService();
      service.start(deps);

      service.stop();

      expect(mockKibanaSection.register).toHaveBeenCalledTimes(1);
      expect(mockKibanaSection.deregister).toHaveBeenCalledTimes(1);
      expect(mockKibanaSection.deregister).toHaveBeenCalledWith('spaces');
    });
  });
});
