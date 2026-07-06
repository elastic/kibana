/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';

import type { BuildFlavor } from '@kbn/config';
import { coreMock } from '@kbn/core/public/mocks';
import type {
  DefinedSections,
  ManagementApp,
  ManagementSetup,
} from '@kbn/management-plugin/public';
import {
  createManagementSectionMock,
  managementPluginMock,
} from '@kbn/management-plugin/public/mocks';
import { AGENT_BUILDER_UIAM_OAUTH_CLIENT_MANAGEMENT_SETTING_ID } from '@kbn/management-settings-ids';

import { apiKeysManagementApp } from './api_keys';
import { applicationConnectionsManagementApp } from './application_connections';
import { ManagementService } from './management_service';
import { roleMappingsManagementApp } from './role_mappings';
import { rolesManagementApp } from './roles';
import { usersManagementApp } from './users';
import type { SecurityLicenseFeatures } from '../../common';
import { licenseMock } from '../../common/licensing/index.mock';
import type { ConfigType } from '../config';
import { securityMock } from '../mocks';

const mockSection = createManagementSectionMock();

const createUiSettingsMock = (initialUiamOAuthClientManagement: boolean = false) => {
  const uiamOAuthClientManagement$ = new BehaviorSubject<boolean>(initialUiamOAuthClientManagement);
  const { uiSettings } = coreMock.createSetup();
  uiSettings.get$.mockImplementation((key: string) => {
    if (key === AGENT_BUILDER_UIAM_OAUTH_CLIENT_MANAGEMENT_SETTING_ID) {
      return uiamOAuthClientManagement$.asObservable();
    }
    return new BehaviorSubject<unknown>(undefined).asObservable();
  });
  return {
    uiSettings,
    updateUiamOAuthClientManagement(enabled: boolean) {
      uiamOAuthClientManagement$.next(enabled);
    },
  };
};

const createConfigMock = (overrides: Partial<ConfigType> = {}): ConfigType => ({
  loginAssistanceMessage: '',
  showInsecureClusterWarning: false,
  sameSiteCookies: undefined,
  roleManagementEnabled: true,
  ui: {
    userManagementEnabled: true,
    roleMappingManagementEnabled: true,
  },
  ...overrides,
});

describe('ManagementService', () => {
  describe('setup()', () => {
    it('properly registers security section and its applications', () => {
      const { fatalErrors, getStartServices } = coreMock.createSetup();
      const { authc } = securityMock.createSetup();
      const license = licenseMock.create();
      const { uiSettings } = createUiSettingsMock();

      const managementSetup: ManagementSetup = {
        sections: {
          register: jest.fn(() => mockSection),
          section: {
            security: mockSection,
          } as DefinedSections,
        },
        locator: {} as any,
        registerAutoOpsStatusHook: jest.fn(),
      };

      const service = new ManagementService({} as unknown as ConfigType);
      service.setup({
        getStartServices: getStartServices as any,
        license,
        fatalErrors,
        uiSettings,
        authc,
        management: managementSetup,
        buildFlavor: 'traditional',
      });

      expect(mockSection.registerApp).toHaveBeenCalledTimes(4);
      expect(mockSection.registerApp).toHaveBeenCalledWith({
        id: 'users',
        mount: expect.any(Function),
        order: 10,
        title: 'Users',
      });
      expect(mockSection.registerApp).toHaveBeenCalledWith({
        id: 'roles',
        mount: expect.any(Function),
        order: 20,
        title: 'Roles',
      });
      expect(mockSection.registerApp).toHaveBeenCalledWith({
        id: 'api_keys',
        mount: expect.any(Function),
        order: 30,
        title: 'API keys',
      });
      expect(mockSection.registerApp).toHaveBeenCalledWith({
        id: 'role_mappings',
        mount: expect.any(Function),
        order: 40,
        title: 'Role Mappings',
      });
      expect(mockSection.registerApp).not.toHaveBeenCalledWith(
        expect.objectContaining({ id: applicationConnectionsManagementApp.id })
      );
    });

    it('registers Application Connections app when UIAM is enabled', () => {
      const mockUiamSection = createManagementSectionMock();
      const { fatalErrors, getStartServices } = coreMock.createSetup();
      const { authc } = securityMock.createSetup();
      authc.isUIAMEnabled.mockReturnValue(true);
      const license = licenseMock.create();
      const { uiSettings } = createUiSettingsMock();

      const managementSetup = managementPluginMock.createSetupContract();
      managementSetup.sections.section.security = mockUiamSection;

      const service = new ManagementService(createConfigMock());
      service.setup({
        getStartServices,
        license,
        fatalErrors,
        uiSettings,
        authc,
        management: managementSetup,
        buildFlavor: 'serverless',
      });

      expect(mockUiamSection.registerApp).toHaveBeenCalledTimes(5);
      expect(mockUiamSection.registerApp).toHaveBeenCalledWith({
        id: applicationConnectionsManagementApp.id,
        mount: expect.any(Function),
        order: 25,
        title: 'Application connections',
      });
    });

    it('does not register Application Connections app when UIAM is disabled, even on serverless', () => {
      const mockServerlessSection = createManagementSectionMock();
      const { fatalErrors, getStartServices } = coreMock.createSetup();
      const { authc } = securityMock.createSetup();
      authc.isUIAMEnabled.mockReturnValue(false);
      const license = licenseMock.create();
      const { uiSettings } = createUiSettingsMock();

      const managementSetup = managementPluginMock.createSetupContract();
      managementSetup.sections.section.security = mockServerlessSection;

      const service = new ManagementService(createConfigMock());
      service.setup({
        getStartServices,
        license,
        fatalErrors,
        uiSettings,
        authc,
        management: managementSetup,
        buildFlavor: 'serverless',
      });

      expect(mockServerlessSection.registerApp).not.toHaveBeenCalledWith(
        expect.objectContaining({ id: applicationConnectionsManagementApp.id })
      );
    });

    it('Users, Roles, and Role Mappings are not registered when their config settings are set to false', () => {
      const mockSectionWithConfig = createManagementSectionMock();
      const { fatalErrors, getStartServices } = coreMock.createSetup();
      const { authc } = securityMock.createSetup();
      const license = licenseMock.create();
      const { uiSettings } = createUiSettingsMock();

      const managementSetup: ManagementSetup = {
        sections: {
          register: jest.fn(() => mockSectionWithConfig),
          section: {
            security: mockSectionWithConfig,
          } as DefinedSections,
        },
        locator: {} as any,
        registerAutoOpsStatusHook: jest.fn(),
      };

      const config = {
        ui: {
          userManagementEnabled: false,
          roleMappingManagementEnabled: false,
        },
        roleManagementEnabled: false,
      } as unknown as ConfigType;

      const service = new ManagementService(config);
      service.setup({
        getStartServices: getStartServices as any,
        license,
        fatalErrors,
        uiSettings,
        authc,
        management: managementSetup,
        buildFlavor: 'traditional',
      });

      expect(mockSectionWithConfig.registerApp).toHaveBeenCalledTimes(1);
      expect(mockSectionWithConfig.registerApp).not.toHaveBeenCalledWith({
        id: 'users',
        mount: expect.any(Function),
        order: 10,
        title: 'Users',
      });
      expect(mockSectionWithConfig.registerApp).not.toHaveBeenCalledWith({
        id: 'roles',
        mount: expect.any(Function),
        order: 20,
        title: 'Roles',
      });
      expect(mockSectionWithConfig.registerApp).toHaveBeenCalledWith({
        id: 'api_keys',
        mount: expect.any(Function),
        order: 30,
        title: 'API keys',
      });
      expect(mockSectionWithConfig.registerApp).not.toHaveBeenCalledWith({
        id: 'role_mappings',
        mount: expect.any(Function),
        order: 40,
        title: 'Role Mappings',
      });
    });
  });

  describe('start()', () => {
    interface StartServiceOptions {
      initialFeatures: Partial<SecurityLicenseFeatures>;
      canManageSecurity?: boolean;
      buildFlavor?: BuildFlavor;
      initialUiamOAuthClientManagement?: boolean;
      isUIAMEnabled?: boolean;
    }

    function startService({
      initialFeatures,
      canManageSecurity = true,
      buildFlavor = 'traditional',
      initialUiamOAuthClientManagement = false,
      isUIAMEnabled = false,
    }: StartServiceOptions) {
      const { fatalErrors, getStartServices } = coreMock.createSetup();

      const licenseSubject = new BehaviorSubject<SecurityLicenseFeatures>(
        initialFeatures as unknown as SecurityLicenseFeatures
      );
      const license = licenseMock.create();
      license.features$ = licenseSubject;

      const { uiSettings, updateUiamOAuthClientManagement } = createUiSettingsMock(
        initialUiamOAuthClientManagement
      );

      const config = {
        ui: {
          userManagementEnabled: true,
          roleMappingManagementEnabled: true,
        },
        roleManagementEnabled: true,
      } as unknown as ConfigType;

      const service = new ManagementService(config);

      const managementSetup: ManagementSetup = {
        sections: {
          register: jest.fn(() => mockSection),
          section: {
            security: mockSection,
          } as DefinedSections,
        },
        locator: {} as any,
        registerAutoOpsStatusHook: jest.fn(),
      };

      const { authc } = securityMock.createSetup();
      authc.isUIAMEnabled.mockReturnValue(isUIAMEnabled);

      service.setup({
        getStartServices: getStartServices as any,
        license,
        fatalErrors,
        uiSettings,
        authc,
        management: managementSetup,
        buildFlavor,
      });

      const getMockedApp = (id: string) => {
        let enabled = true;
        return {
          id,
          get enabled() {
            return enabled;
          },
          enable: jest.fn().mockImplementation(() => {
            enabled = true;
          }),
          disable: jest.fn().mockImplementation(() => {
            enabled = false;
          }),
        } as unknown as jest.Mocked<ManagementApp>;
      };
      const mockApps = new Map<string, jest.Mocked<ManagementApp>>([
        [usersManagementApp.id, getMockedApp(usersManagementApp.id)],
        [rolesManagementApp.id, getMockedApp(rolesManagementApp.id)],
        [apiKeysManagementApp.id, getMockedApp(apiKeysManagementApp.id)],
        [roleMappingsManagementApp.id, getMockedApp(roleMappingsManagementApp.id)],
        [
          applicationConnectionsManagementApp.id,
          getMockedApp(applicationConnectionsManagementApp.id),
        ],
      ] as Array<[string, jest.Mocked<ManagementApp>]>);
      mockSection.getApp = jest.fn().mockImplementation((id) => mockApps.get(id));

      service.start({
        capabilities: {
          management: {
            security: {
              users: canManageSecurity,
              roles: canManageSecurity,
              role_mappings: canManageSecurity,
              api_keys: canManageSecurity,
              [applicationConnectionsManagementApp.id]: canManageSecurity,
            },
          },
          navLinks: {},
          catalogue: {},
        },
      });

      return {
        mockApps,
        updateFeatures(features: Partial<SecurityLicenseFeatures>) {
          licenseSubject.next(features as unknown as SecurityLicenseFeatures);
        },
        updateUiamOAuthClientManagement,
      };
    }

    // Apps that are license-gated only (i.e. not also FF-gated). Application
    // Connections is excluded because it has an additional uiSetting gate
    // (`agentBuilder:uiamOAuthClientManagement`) on top of `showLinks`.
    const LICENSE_GATED_APP_IDS = [
      usersManagementApp.id,
      rolesManagementApp.id,
      apiKeysManagementApp.id,
      roleMappingsManagementApp.id,
    ];

    it('does not do anything if `showLinks` is `true` at `start`', () => {
      const { mockApps } = startService({
        initialFeatures: { showLinks: true, showRoleMappingsManagement: true },
      });
      for (const appId of LICENSE_GATED_APP_IDS) {
        const mockApp = mockApps.get(appId)!;
        expect(mockApp.enable).not.toHaveBeenCalled();
        expect(mockApp.disable).not.toHaveBeenCalled();
        expect(mockApp.enabled).toBe(true);
      }
    });

    it('disables all license-gated apps if `showLinks` is `false` at `start`', () => {
      const { mockApps } = startService({
        initialFeatures: { showLinks: false, showRoleMappingsManagement: true },
      });
      for (const appId of LICENSE_GATED_APP_IDS) {
        expect(mockApps.get(appId)!.enabled).toBe(false);
      }
    });

    it('disables only Role Mappings app if `showLinks` is `true`, but `showRoleMappingsManagement` is `false` at `start`', () => {
      const { mockApps } = startService({
        initialFeatures: { showLinks: true, showRoleMappingsManagement: false },
      });
      for (const appId of LICENSE_GATED_APP_IDS) {
        expect(mockApps.get(appId)!.enabled).toBe(appId !== roleMappingsManagementApp.id);
      }
    });

    it('license-gated apps are disabled if `showLinks` changes after `start`', () => {
      const { mockApps, updateFeatures } = startService({
        initialFeatures: { showLinks: true, showRoleMappingsManagement: true },
      });
      for (const appId of LICENSE_GATED_APP_IDS) {
        expect(mockApps.get(appId)!.enabled).toBe(true);
      }

      updateFeatures({ showLinks: false, showRoleMappingsManagement: false });

      for (const appId of LICENSE_GATED_APP_IDS) {
        expect(mockApps.get(appId)!.enabled).toBe(false);
      }
    });

    it('apps are disabled if capabilities are false', () => {
      const { mockApps } = startService({
        initialFeatures: {
          showLinks: true,
          showRoleMappingsManagement: true,
        },
        canManageSecurity: false,
      });
      for (const appId of LICENSE_GATED_APP_IDS) {
        expect(mockApps.get(appId)!.enabled).toBe(false);
      }
    });

    it('role mappings app is disabled if `showRoleMappingsManagement` changes after `start`', () => {
      const { mockApps, updateFeatures } = startService({
        initialFeatures: { showLinks: true, showRoleMappingsManagement: true },
      });
      for (const appId of LICENSE_GATED_APP_IDS) {
        expect(mockApps.get(appId)!.enabled).toBe(true);
      }

      updateFeatures({ showLinks: true, showRoleMappingsManagement: false });

      for (const appId of LICENSE_GATED_APP_IDS) {
        expect(mockApps.get(appId)!.enabled).toBe(appId !== roleMappingsManagementApp.id);
      }
    });

    it('apps are re-enabled if `showLinks` eventually transitions to `true` after `start`', () => {
      const { mockApps, updateFeatures } = startService({
        initialFeatures: { showLinks: true, showRoleMappingsManagement: true },
      });
      for (const appId of LICENSE_GATED_APP_IDS) {
        expect(mockApps.get(appId)!.enabled).toBe(true);
      }

      updateFeatures({ showLinks: false, showRoleMappingsManagement: false });

      for (const appId of LICENSE_GATED_APP_IDS) {
        expect(mockApps.get(appId)!.enabled).toBe(false);
      }

      updateFeatures({ showLinks: true, showRoleMappingsManagement: true });

      for (const appId of LICENSE_GATED_APP_IDS) {
        expect(mockApps.get(appId)!.enabled).toBe(true);
      }
    });

    describe('Application Connections app (UIAM + UIAM OAuth client management gate)', () => {
      it('is not enabled when UIAM is disabled, even when the UIAM OAuth client management setting is on', () => {
        const { mockApps } = startService({
          initialFeatures: { showLinks: true, showRoleMappingsManagement: true },
          isUIAMEnabled: false,
          initialUiamOAuthClientManagement: true,
        });
        // App is never added to the status array when UIAM is disabled, so it
        // stays at its default mock-enabled state and is never touched by the
        // service. We only assert that it was neither enabled nor disabled.
        const app = mockApps.get(applicationConnectionsManagementApp.id)!;
        expect(app.enable).not.toHaveBeenCalled();
        expect(app.disable).not.toHaveBeenCalled();
      });

      it('is disabled when UIAM is enabled but the UIAM OAuth client management setting is off', () => {
        const { mockApps } = startService({
          initialFeatures: { showLinks: true, showRoleMappingsManagement: true },
          isUIAMEnabled: true,
          initialUiamOAuthClientManagement: false,
        });
        expect(mockApps.get(applicationConnectionsManagementApp.id)!.enabled).toBe(false);
      });

      it('is enabled when UIAM is enabled, `showLinks` is true, and the UIAM OAuth client management setting is on', () => {
        const { mockApps } = startService({
          initialFeatures: { showLinks: true, showRoleMappingsManagement: true },
          isUIAMEnabled: true,
          initialUiamOAuthClientManagement: true,
        });
        expect(mockApps.get(applicationConnectionsManagementApp.id)!.enabled).toBe(true);
      });

      it('is disabled when `showLinks` is false, regardless of the UIAM OAuth client management setting', () => {
        const { mockApps } = startService({
          initialFeatures: { showLinks: false, showRoleMappingsManagement: true },
          isUIAMEnabled: true,
          initialUiamOAuthClientManagement: true,
        });
        expect(mockApps.get(applicationConnectionsManagementApp.id)!.enabled).toBe(false);
      });

      it('toggles reactively when the UIAM OAuth client management setting changes after `start`', () => {
        const { mockApps, updateUiamOAuthClientManagement } = startService({
          initialFeatures: { showLinks: true, showRoleMappingsManagement: true },
          isUIAMEnabled: true,
          initialUiamOAuthClientManagement: false,
        });
        const app = mockApps.get(applicationConnectionsManagementApp.id)!;
        expect(app.enabled).toBe(false);

        updateUiamOAuthClientManagement(true);
        expect(app.enabled).toBe(true);

        updateUiamOAuthClientManagement(false);
        expect(app.enabled).toBe(false);
      });

      it('is disabled when the user lacks management capability, even with UIAM and the UIAM OAuth client management setting on', () => {
        const { mockApps } = startService({
          initialFeatures: { showLinks: true, showRoleMappingsManagement: true },
          canManageSecurity: false,
          isUIAMEnabled: true,
          initialUiamOAuthClientManagement: true,
        });
        expect(mockApps.get(applicationConnectionsManagementApp.id)!.enabled).toBe(false);
      });
    });
  });
});
