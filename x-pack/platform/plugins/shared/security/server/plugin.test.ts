/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { of } from 'rxjs';

import { ByteSizeValue } from '@kbn/config-schema';
import type { PluginInitializerContextMock } from '@kbn/core/server/mocks';
import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';

import { ConfigSchema } from './config';
import type { PluginSetupDependencies, PluginStartDependencies } from './plugin';
import { SecurityPlugin } from './plugin';
import { setupSavedObjects } from './saved_objects';
import { userProfileServiceMock } from './user_profile/user_profile_service.mock';

jest.mock('./saved_objects', () => ({
  __esModule: true,
  setupSavedObjects: jest.fn(),
  // Lazy re-exports: eagerly requiring the real module here would force-evaluate its
  // re-export getters during a circular-init window (index -> security_extension ->
  // access_control_service -> index) and crash. Defer to access time instead.
  get SecurityAction() {
    return jest.requireActual('./saved_objects').SecurityAction;
  },
  get SavedObjectsSecurityExtension() {
    return jest.requireActual('./saved_objects').SavedObjectsSecurityExtension;
  },
}));

describe('Security Plugin', () => {
  let plugin: SecurityPlugin;
  let mockCoreSetup: ReturnType<typeof coreMock.createSetup>;
  let mockCoreStart: ReturnType<typeof coreMock.createStart>;
  let mockSetupDependencies: PluginSetupDependencies;
  let mockStartDependencies: PluginStartDependencies;
  let mockInitializerContext: PluginInitializerContextMock<typeof ConfigSchema>;
  beforeEach(() => {
    jest.clearAllMocks();
    mockInitializerContext = coreMock.createPluginInitializerContext(
      ConfigSchema.validate(
        {
          session: { idleTimeout: 1500 },
          authc: {
            providers: ['saml', 'token'],
            saml: { realm: 'saml1', maxRedirectURLSize: new ByteSizeValue(2048) },
          },
          encryptionKey: 'z'.repeat(32),
        },
        { dist: true }
      )
    );
    plugin = new SecurityPlugin(mockInitializerContext);

    mockCoreSetup = coreMock.createSetup({
      pluginStartContract: { userProfiles: userProfileServiceMock.createStart() },
    });

    const core = coreMock.createRequestHandlerContext();

    core.elasticsearch.client.asInternalUser.xpack.usage.mockResolvedValue({
      security: { operator_privileges: { enabled: false, available: false } },
    } as Awaited<ReturnType<Client['xpack']['usage']>>);

    mockSetupDependencies = {
      licensing: {
        license$: of({ getUnavailableReason: jest.fn() }),
        featureUsage: { register: jest.fn() },
      },
      features: featuresPluginMock.createSetup(),
      taskManager: taskManagerMock.createSetup(),
    } as unknown as PluginSetupDependencies;

    mockCoreStart = coreMock.createStart();
    mockCoreStart.http.getServerInfo.mockReturnValue({
      hostname: 'localhost',
      name: 'kibana',
      port: 80,
      protocol: 'https',
    });

    mockCoreSetup.getStartServices.mockResolvedValue([
      // @ts-expect-error only mocking the client we use
      { elasticsearch: core.elasticsearch },
      mockSetupDependencies.features,
    ]);

    mockStartDependencies = {
      features: featuresPluginMock.createStart(),
      licensing: licensingMock.createStart(),
      taskManager: taskManagerMock.createStart(),
    };
  });

  describe('saved object diff config wiring', () => {
    // Derives the params passed to setupSavedObjects() for a given `audit` config block.
    const setupWithAudit = (audit: Record<string, unknown>) => {
      const initializerContext = coreMock.createPluginInitializerContext(
        ConfigSchema.validate(
          {
            session: { idleTimeout: 1500 },
            authc: {
              providers: ['saml', 'token'],
              saml: { realm: 'saml1', maxRedirectURLSize: new ByteSizeValue(2048) },
            },
            encryptionKey: 'z'.repeat(32),
            audit,
          },
          { dist: true }
        )
      );
      new SecurityPlugin(initializerContext).setup(mockCoreSetup, mockSetupDependencies);
      return (setupSavedObjects as jest.Mock).mock.calls[0][0];
    };

    it('derives enabled + typesToExclude + fieldSizeLimit (in bytes) when the block is on', () => {
      const params = setupWithAudit({
        enabled: true,
        savedObjectDiff: { enabled: true, typesToExclude: ['dashboard'], fieldSizeLimit: '20kb' },
      });
      expect(params).toMatchObject({
        savedObjectDiffEnabled: true,
        savedObjectDiffTypesToExclude: ['dashboard'],
        savedObjectDiffFieldSizeLimit: 20480,
      });
    });

    it('leaves enabled=false and the other params undefined when the block is absent', () => {
      const params = setupWithAudit({ enabled: true });
      expect(params.savedObjectDiffEnabled).toBe(false);
      expect(params.savedObjectDiffTypesToExclude).toBeUndefined();
      expect(params.savedObjectDiffFieldSizeLimit).toBeUndefined();
    });

    it('sets enabled=false when audit itself is disabled', () => {
      expect(setupWithAudit({ enabled: false }).savedObjectDiffEnabled).toBe(false);
    });

    it('sets enabled=false but still forwards defaults when the block is present but disabled', () => {
      const params = setupWithAudit({ enabled: true, savedObjectDiff: { enabled: false } });
      expect(params).toMatchObject({
        savedObjectDiffEnabled: false,
        savedObjectDiffTypesToExclude: [],
        savedObjectDiffFieldSizeLimit: 49152,
      });
    });
  });

  describe('setup()', () => {
    it('exposes proper contract', () => {
      expect(plugin.setup(mockCoreSetup, mockSetupDependencies)).toMatchInlineSnapshot(`
        Object {
          "audit": Object {
            "asScoped": [Function],
            "withoutRequest": Object {
              "enabled": false,
              "includeSavedObjectNames": true,
              "log": [Function],
            },
          },
          "authc": Object {
            "getCurrentUser": [Function],
          },
          "authz": Object {
            "actions": Actions {
              "alerting": AlertingActions {
                "prefix": "alerting:",
              },
              "alerts": AlertsActions {
                "prefix": "alerts:",
              },
              "api": ApiActions {
                "prefix": "api:",
              },
              "app": AppActions {
                "prefix": "app:",
              },
              "cases": CasesActions {
                "prefix": "cases:",
              },
              "login": "login:",
              "savedObject": SavedObjectActions {
                "prefix": "saved_object:",
              },
              "space": SpaceActions {
                "prefix": "space:",
              },
              "ui": UIActions {
                "prefix": "ui:",
              },
            },
            "checkPrivilegesDynamicallyWithRequest": [Function],
            "checkPrivilegesWithRequest": [Function],
            "checkSavedObjectsPrivilegesWithRequest": [Function],
            "mode": Object {
              "useRbacForRequest": [Function],
            },
          },
          "license": Object {
            "features$": Observable {
              "operator": [Function],
              "source": Observable {
                "_subscribe": [Function],
              },
            },
            "getFeatures": [Function],
            "getLicenseType": [Function],
            "getUnavailableReason": [Function],
            "hasAtLeast": [Function],
            "isEnabled": [Function],
            "isLicenseAvailable": [Function],
          },
          "privilegeDeprecationsService": Object {
            "getKibanaRolesByFeatureId": [Function],
          },
        }
      `);
    });

    it('calls core.security.registerSecurityDelegate', () => {
      plugin.setup(mockCoreSetup, mockSetupDependencies);

      expect(mockCoreSetup.security.registerSecurityDelegate).toHaveBeenCalledTimes(1);
    });

    it('calls core.userProfile.registerUserProfileDelegate', () => {
      plugin.setup(mockCoreSetup, mockSetupDependencies);

      expect(mockCoreSetup.userProfile.registerUserProfileDelegate).toHaveBeenCalledTimes(1);
    });

    it('logs the hash for the security encryption key', () => {
      plugin.setup(mockCoreSetup, mockSetupDependencies);

      const infoLogs = loggingSystemMock.collect(mockInitializerContext.logger).info;

      expect(infoLogs.length).toBeGreaterThan(0);
      infoLogs.forEach((log) => {
        expect(log).toEqual([
          `Hashed 'xpack.security.encryptionKey' for this instance: WLbjNGKEm7aA4NfJHYyW88jHUkHtyF7ENHcF0obYGBU=`,
        ]);
      });
    });
  });

  describe('start()', () => {
    it('exposes proper contract', async () => {
      mockCoreSetup.http.getServerInfo.mockReturnValue({
        hostname: 'localhost',
        name: 'kibana',
        port: 80,
        protocol: 'https',
      });

      await plugin.setup(mockCoreSetup, mockSetupDependencies);
      expect(plugin.start(mockCoreStart, mockStartDependencies)).toMatchInlineSnapshot(`
        Object {
          "authc": Object {
            "apiKeys": Object {
              "areAPIKeysEnabled": [Function],
              "areCrossClusterAPIKeysEnabled": [Function],
              "cloneAsInternalUser": [Function],
              "create": [Function],
              "grantAsInternalUser": [Function],
              "invalidate": [Function],
              "invalidateAsInternalUser": [Function],
              "update": [Function],
              "validate": [Function],
            },
            "getCurrentUser": [Function],
          },
          "authz": Object {
            "actions": Actions {
              "alerting": AlertingActions {
                "prefix": "alerting:",
              },
              "alerts": AlertsActions {
                "prefix": "alerts:",
              },
              "api": ApiActions {
                "prefix": "api:",
              },
              "app": AppActions {
                "prefix": "app:",
              },
              "cases": CasesActions {
                "prefix": "cases:",
              },
              "login": "login:",
              "savedObject": SavedObjectActions {
                "prefix": "saved_object:",
              },
              "space": SpaceActions {
                "prefix": "space:",
              },
              "ui": UIActions {
                "prefix": "ui:",
              },
            },
            "checkPrivilegesDynamicallyWithRequest": [Function],
            "checkPrivilegesWithRequest": [Function],
            "checkSavedObjectsPrivilegesWithRequest": [Function],
            "mode": Object {
              "useRbacForRequest": [Function],
            },
          },
          "userProfiles": Object {
            "bulkGet": [Function],
            "getCurrent": [Function],
            "getCurrentProfileId": [Function],
            "suggest": [Function],
          },
        }
      `);
    });
  });

  describe('stop()', () => {
    beforeEach(async () => await plugin.setup(mockCoreSetup, mockSetupDependencies));

    it('close does not throw', async () => {
      await plugin.stop();
    });
  });
});
