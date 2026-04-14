/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';

import { ConfigSchema } from './config';
import { EncryptedSavedObjectsService } from './crypto';
import { EncryptedSavedObjectsPlugin } from './plugin';

describe('EncryptedSavedObjects Plugin', () => {
  describe('setup()', () => {
    it('exposes proper contract', () => {
      const plugin = new EncryptedSavedObjectsPlugin(
        coreMock.createPluginInitializerContext(ConfigSchema.validate({}, { dist: true }))
      );
      expect(plugin.setup(coreMock.createSetup(), { security: securityMock.createSetup() }))
        .toMatchInlineSnapshot(`
        Object {
          "canEncrypt": false,
          "createMigration": [Function],
          "createModelVersion": [Function],
          "registerType": [Function],
        }
      `);
    });

    it('exposes proper contract when encryption key is set', () => {
      const mockInitializerContext = coreMock.createPluginInitializerContext(
        ConfigSchema.validate({ encryptionKey: 'z'.repeat(32) }, { dist: true })
      );

      const plugin = new EncryptedSavedObjectsPlugin(mockInitializerContext);

      expect(plugin.setup(coreMock.createSetup(), { security: securityMock.createSetup() }))
        .toMatchInlineSnapshot(`
        Object {
          "canEncrypt": true,
          "createMigration": [Function],
          "createModelVersion": [Function],
          "registerType": [Function],
        }
      `);

      const infoLogs = loggingSystemMock.collect(mockInitializerContext.logger).info;

      expect(infoLogs.length).toBe(1);
      expect(infoLogs[0]).toEqual([
        `Hashed 'xpack.encryptedSavedObjects.encryptionKey' for this instance: WLbjNGKEm7aA4NfJHYyW88jHUkHtyF7ENHcF0obYGBU=`,
      ]);
    });

    it('logs the hash for the saved object encryption key and all decryption-only keys', () => {
      const mockInitializerContext = coreMock.createPluginInitializerContext(
        ConfigSchema.validate(
          {
            encryptionKey: 'z'.repeat(32),
            keyRotation: { decryptionOnlyKeys: ['a'.repeat(32), 'b'.repeat(32)] },
          },
          { dist: true }
        )
      );

      const plugin = new EncryptedSavedObjectsPlugin(mockInitializerContext);
      plugin.setup(coreMock.createSetup(), { security: securityMock.createSetup() });

      const infoLogs = loggingSystemMock.collect(mockInitializerContext.logger).info;

      expect(infoLogs.length).toBe(2);
      expect(infoLogs[0]).toEqual([
        `Hashed 'xpack.encryptedSavedObjects.encryptionKey' for this instance: WLbjNGKEm7aA4NfJHYyW88jHUkHtyF7ENHcF0obYGBU=`,
      ]);
      expect(infoLogs[1]).toEqual([
        "Hashed 'xpack.encryptedSavedObjects.keyRotation.decryptionOnlyKeys' for this instance: Lu5CspnLRLs9XdCgIhDOKd68IRC3xGRP84xTCElAviE=,3SPdLHuCi17QOhWjiG3GMBTIk/5B7Oteg3k4rX+arNU=",
      ]);
    });
  });

  describe('start()', () => {
    it('exposes proper contract', () => {
      const plugin = new EncryptedSavedObjectsPlugin(
        coreMock.createPluginInitializerContext(ConfigSchema.validate({}, { dist: true }))
      );
      plugin.setup(coreMock.createSetup(), { security: securityMock.createSetup() });

      const startContract = plugin.start();
      expect(startContract).toMatchInlineSnapshot(`
              Object {
                "__testCreateDangerousExtension": [Function],
                "getClient": [Function],
                "isEncryptionError": [Function],
              }
            `);

      expect(startContract.getClient()).toMatchInlineSnapshot(`
        Object {
          "createPointInTimeFinderDecryptedAsInternalUser": [Function],
          "getDecryptedAsInternalUser": [Function],
        }
      `);
    });

    describe('__testCreateExtension', () => {
      it('creates a SavedObjectsEncryptionExtension with the provided type registry', () => {
        const mockInitializerContext = coreMock.createPluginInitializerContext(
          ConfigSchema.validate({ encryptionKey: 'z'.repeat(32) }, { dist: true })
        );
        const plugin = new EncryptedSavedObjectsPlugin(mockInitializerContext);
        plugin.setup(coreMock.createSetup(), { security: securityMock.createSetup() });

        const startContract = plugin.start();
        const mockTypeRegistry = { isNamespaceAgnostic: jest.fn() } as any;
        const extension = startContract.__testCreateDangerousExtension(mockTypeRegistry, []);

        expect(extension).toBeDefined();
        expect(extension._baseTypeRegistry).toBe(mockTypeRegistry);
      });

      it('registers type registration overrides to the service', () => {
        const mockInitializerContext = coreMock.createPluginInitializerContext(
          ConfigSchema.validate({ encryptionKey: 'z'.repeat(32) }, { dist: true })
        );
        const plugin = new EncryptedSavedObjectsPlugin(mockInitializerContext);
        plugin.setup(coreMock.createSetup(), { security: securityMock.createSetup() });

        const startContract = plugin.start();
        const mockTypeRegistry = { isNamespaceAgnostic: jest.fn() } as any;
        const typeRegistration = {
          type: 'test-type',
          attributesToEncrypt: new Set(['secret']),
        };

        const extension = startContract.__testCreateDangerousExtension(mockTypeRegistry, [
          typeRegistration,
        ]);

        expect(extension._service.isRegistered('test-type')).toBe(true);
      });

      it('registers existing type registrations from setup', () => {
        const mockInitializerContext = coreMock.createPluginInitializerContext(
          ConfigSchema.validate({ encryptionKey: 'z'.repeat(32) }, { dist: true })
        );
        const plugin = new EncryptedSavedObjectsPlugin(mockInitializerContext);
        const setupContract = plugin.setup(coreMock.createSetup(), {
          security: securityMock.createSetup(),
        });

        setupContract.registerType({
          type: 'existing-type',
          attributesToEncrypt: new Set(['password']),
        });

        const startContract = plugin.start();
        const mockTypeRegistry = { isNamespaceAgnostic: jest.fn() } as any;

        const extension = startContract.__testCreateDangerousExtension(mockTypeRegistry, []);

        expect(extension._service.isRegistered('existing-type')).toBe(true);
      });

      it('skips existing type registrations when override has matching type', () => {
        const mockInitializerContext = coreMock.createPluginInitializerContext(
          ConfigSchema.validate({ encryptionKey: 'z'.repeat(32) }, { dist: true })
        );
        const plugin = new EncryptedSavedObjectsPlugin(mockInitializerContext);
        const setupContract = plugin.setup(coreMock.createSetup(), {
          security: securityMock.createSetup(),
        });

        setupContract.registerType({
          type: 'shared-type',
          attributesToEncrypt: new Set(['oldSecret']),
        });

        const startContract = plugin.start();
        const mockTypeRegistry = { isNamespaceAgnostic: jest.fn() } as any;

        const overrideRegistration = {
          type: 'shared-type',
          attributesToEncrypt: new Set(['newSecret']),
        };

        const extension = startContract.__testCreateDangerousExtension(mockTypeRegistry, [
          overrideRegistration,
        ]);

        expect(extension._service.isRegistered('shared-type')).toBe(true);
        const registeredTypes = extension._service.getRegisteredTypes();
        expect(registeredTypes.filter((t) => t === 'shared-type').length).toBe(1);
      });

      it('registers both overrides and non-conflicting existing types', () => {
        const mockInitializerContext = coreMock.createPluginInitializerContext(
          ConfigSchema.validate({ encryptionKey: 'z'.repeat(32) }, { dist: true })
        );
        const plugin = new EncryptedSavedObjectsPlugin(mockInitializerContext);
        const setupContract = plugin.setup(coreMock.createSetup(), {
          security: securityMock.createSetup(),
        });

        setupContract.registerType({
          type: 'existing-type-1',
          attributesToEncrypt: new Set(['secret1']),
        });
        setupContract.registerType({
          type: 'existing-type-2',
          attributesToEncrypt: new Set(['secret2']),
        });

        const startContract = plugin.start();
        const mockTypeRegistry = { isNamespaceAgnostic: jest.fn() } as any;

        const overrideRegistration = {
          type: 'override-type',
          attributesToEncrypt: new Set(['overrideSecret']),
        };

        const extension = startContract.__testCreateDangerousExtension(mockTypeRegistry, [
          overrideRegistration,
        ]);

        expect(extension._service.isRegistered('existing-type-1')).toBe(true);
        expect(extension._service.isRegistered('existing-type-2')).toBe(true);
        expect(extension._service.isRegistered('override-type')).toBe(true);
      });

      it('works without encryption key configured', () => {
        const mockInitializerContext = coreMock.createPluginInitializerContext(
          ConfigSchema.validate({}, { dist: true })
        );
        const plugin = new EncryptedSavedObjectsPlugin(mockInitializerContext);
        plugin.setup(coreMock.createSetup(), { security: securityMock.createSetup() });

        const startContract = plugin.start();
        const mockTypeRegistry = { isNamespaceAgnostic: jest.fn() } as any;

        const extension = startContract.__testCreateDangerousExtension(mockTypeRegistry, []);

        expect(extension).toBeDefined();
        expect(extension._baseTypeRegistry).toBe(mockTypeRegistry);
      });

      it('dangerously exposes string attributes from overrides', () => {
        const mockInitializerContext = coreMock.createPluginInitializerContext(
          ConfigSchema.validate({ encryptionKey: 'z'.repeat(32) }, { dist: true })
        );
        const plugin = new EncryptedSavedObjectsPlugin(mockInitializerContext);
        plugin.setup(coreMock.createSetup(), { security: securityMock.createSetup() });

        const registerTypeSpy = jest.spyOn(EncryptedSavedObjectsService.prototype, 'registerType');

        const startContract = plugin.start();
        const mockTypeRegistry = { isNamespaceAgnostic: jest.fn() } as any;

        startContract.__testCreateDangerousExtension(mockTypeRegistry, [
          {
            type: 'test-type',
            attributesToEncrypt: new Set(['secret', 'apiKey']),
          },
        ]);

        const registeredArgs = registerTypeSpy.mock.calls.find(([reg]) => reg.type === 'test-type');
        expect(registeredArgs).toBeDefined();
        const registeredAttrs = [...registeredArgs![0].attributesToEncrypt];
        expect(registeredAttrs).toEqual(
          expect.arrayContaining([
            { key: 'secret', dangerouslyExposeValue: true },
            { key: 'apiKey', dangerouslyExposeValue: true },
          ])
        );

        registerTypeSpy.mockRestore();
      });

      it('dangerously exposes object attributes without dangerouslyExposeValue from overrides', () => {
        const mockInitializerContext = coreMock.createPluginInitializerContext(
          ConfigSchema.validate({ encryptionKey: 'z'.repeat(32) }, { dist: true })
        );
        const plugin = new EncryptedSavedObjectsPlugin(mockInitializerContext);
        plugin.setup(coreMock.createSetup(), { security: securityMock.createSetup() });

        const registerTypeSpy = jest.spyOn(EncryptedSavedObjectsService.prototype, 'registerType');

        const startContract = plugin.start();
        const mockTypeRegistry = { isNamespaceAgnostic: jest.fn() } as any;

        startContract.__testCreateDangerousExtension(mockTypeRegistry, [
          {
            type: 'test-type',
            attributesToEncrypt: new Set([{ key: 'token' }, { key: 'password' }]),
          },
        ]);

        const registeredArgs = registerTypeSpy.mock.calls.find(([reg]) => reg.type === 'test-type');
        expect(registeredArgs).toBeDefined();
        const registeredAttrs = [...registeredArgs![0].attributesToEncrypt];
        expect(registeredAttrs).toEqual(
          expect.arrayContaining([
            { key: 'token', dangerouslyExposeValue: true },
            { key: 'password', dangerouslyExposeValue: true },
          ])
        );

        registerTypeSpy.mockRestore();
      });

      it('dangerously exposes attributes from existing setup registrations', () => {
        const mockInitializerContext = coreMock.createPluginInitializerContext(
          ConfigSchema.validate({ encryptionKey: 'z'.repeat(32) }, { dist: true })
        );
        const plugin = new EncryptedSavedObjectsPlugin(mockInitializerContext);
        const setupContract = plugin.setup(coreMock.createSetup(), {
          security: securityMock.createSetup(),
        });

        setupContract.registerType({
          type: 'existing-type',
          attributesToEncrypt: new Set(['secret']),
        });

        const registerTypeSpy = jest.spyOn(EncryptedSavedObjectsService.prototype, 'registerType');

        const startContract = plugin.start();
        const mockTypeRegistry = { isNamespaceAgnostic: jest.fn() } as any;

        startContract.__testCreateDangerousExtension(mockTypeRegistry, []);

        const registeredArgs = registerTypeSpy.mock.calls.find(
          ([reg]) => reg.type === 'existing-type'
        );
        expect(registeredArgs).toBeDefined();
        const registeredAttrs = [...registeredArgs![0].attributesToEncrypt];
        expect(registeredAttrs).toEqual([{ key: 'secret', dangerouslyExposeValue: true }]);

        registerTypeSpy.mockRestore();
      });

      it('preserves dangerouslyExposeValue when already set to true', () => {
        const mockInitializerContext = coreMock.createPluginInitializerContext(
          ConfigSchema.validate({ encryptionKey: 'z'.repeat(32) }, { dist: true })
        );
        const plugin = new EncryptedSavedObjectsPlugin(mockInitializerContext);
        plugin.setup(coreMock.createSetup(), { security: securityMock.createSetup() });

        const registerTypeSpy = jest.spyOn(EncryptedSavedObjectsService.prototype, 'registerType');

        const startContract = plugin.start();
        const mockTypeRegistry = { isNamespaceAgnostic: jest.fn() } as any;

        startContract.__testCreateDangerousExtension(mockTypeRegistry, [
          {
            type: 'test-type',
            attributesToEncrypt: new Set([{ key: 'token', dangerouslyExposeValue: true }]),
          },
        ]);

        const registeredArgs = registerTypeSpy.mock.calls.find(([reg]) => reg.type === 'test-type');
        expect(registeredArgs).toBeDefined();
        const registeredAttrs = [...registeredArgs![0].attributesToEncrypt];
        expect(registeredAttrs).toEqual([{ key: 'token', dangerouslyExposeValue: true }]);

        registerTypeSpy.mockRestore();
      });

      it('sets dangerouslyExposeValue to true if it was already set to false', () => {
        const mockInitializerContext = coreMock.createPluginInitializerContext(
          ConfigSchema.validate({ encryptionKey: 'z'.repeat(32) }, { dist: true })
        );
        const plugin = new EncryptedSavedObjectsPlugin(mockInitializerContext);
        plugin.setup(coreMock.createSetup(), { security: securityMock.createSetup() });

        const registerTypeSpy = jest.spyOn(EncryptedSavedObjectsService.prototype, 'registerType');

        const startContract = plugin.start();
        const mockTypeRegistry = { isNamespaceAgnostic: jest.fn() } as any;

        startContract.__testCreateDangerousExtension(mockTypeRegistry, [
          {
            type: 'test-type',
            attributesToEncrypt: new Set([{ key: 'token', dangerouslyExposeValue: false }]),
          },
        ]);

        const registeredArgs = registerTypeSpy.mock.calls.find(([reg]) => reg.type === 'test-type');
        expect(registeredArgs).toBeDefined();
        const registeredAttrs = [...registeredArgs![0].attributesToEncrypt];
        expect(registeredAttrs).toEqual([{ key: 'token', dangerouslyExposeValue: true }]);

        registerTypeSpy.mockRestore();
      });
    });
  });
});
