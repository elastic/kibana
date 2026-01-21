/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MaintenanceWindowsPublicPlugin } from './plugin';
import { coreMock } from '@kbn/core/public/mocks';
import {
  createManagementSectionMock,
  managementPluginMock,
} from '@kbn/management-plugin/public/mocks';

const mockInitializerContext = coreMock.createPluginInitializerContext();
const management = managementPluginMock.createSetupContract();
const mockSection = createManagementSectionMock();

describe('Maintenance Windows Public Plugin', () => {
  describe('setup()', () => {
    it('returns expected public contract', () => {
      const coreSetup = coreMock.createSetup();
      mockSection.registerApp = jest.fn();
      management.sections.section.insightsAndAlerting = mockSection;

      const plugin = new MaintenanceWindowsPublicPlugin(mockInitializerContext);
      plugin.setup(coreSetup, { management });

      expect(management.sections.section.insightsAndAlerting.registerApp).toHaveBeenCalledWith({
        id: 'maintenanceWindows',
        title: 'Maintenance Windows',
        mount: expect.any(Function),
      });
    });
  });
});
