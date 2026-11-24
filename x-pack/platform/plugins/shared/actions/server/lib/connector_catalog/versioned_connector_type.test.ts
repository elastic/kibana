/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';
import { z } from '@kbn/zod/v4';
import { actionsConfigMock } from '../../actions_config.mock';
import type { ActionType, ActionTypeExecutorOptions } from '../../types';
import { SpecVersionUnavailableError } from '../errors';
import { resolveConnectorSpecVersion } from '../resolve_connector_spec_version';
import type { CatalogActionType } from './types';
import type { BuiltSpecVersion, VersionedConnectorType } from './versioned_connector_type';
import { createVersionedConnectorType } from './versioned_connector_type';

const ID = '.stub';

interface Stub extends BuiltSpecVersion {
  executor: jest.Mock;
}

const createStubType = (version: string, overrides: Partial<CatalogActionType> = {}): Stub => {
  const spec = {
    metadata: { id: ID, displayName: `Stub ${version}` },
    schema: z.object({}),
    actions: {},
  } as unknown as ConnectorSpec;
  const executor = jest.fn().mockResolvedValue({ status: 'ok', actionId: `ran-${version}` });
  const type: CatalogActionType = {
    id: ID,
    name: `Stub ${version}`,
    description: `description ${version}`,
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: ['workflows'],
    isTestable: version !== '1.0',
    globalAuthHeaders: { 'x-version': version },
    sandboxSupportedAuthTypes: [`auth-${version}`],
    getSandboxHosts: () => [`host-${version}`],
    spec,
    validate: {
      config: {
        schema: {
          parse: jest.fn((value) => ({ ...(value as object), from: `config-${version}` })),
        },
        customValidator: jest.fn(),
      },
      secrets: {
        schema: {
          parse: jest.fn((value) => ({ ...(value as object), from: `secrets-${version}` })),
        },
        customValidator: jest.fn(),
      },
      params: {
        schema: {
          parse: jest.fn((value) => ({ ...(value as object), from: `params-${version}` })),
        },
        customValidator: jest.fn(),
      },
    },
    executor,
    ...overrides,
  };
  return { version, type, executor };
};

const executorOptions = (specVersion?: string) =>
  ({
    actionId: 'connector-id',
    params: {},
    config: {},
    secrets: {},
    globalAuthHeaders: { 'x-version': 'from-caller' },
    ...(specVersion ? { specVersion } : {}),
  } as unknown as ActionTypeExecutorOptions<
    Record<string, unknown>,
    Record<string, unknown>,
    Record<string, unknown>
  >);

const run = async (versioned: VersionedConnectorType, specVersion?: string) => {
  const { executor } = versioned.actionType;
  if (!executor) {
    throw new Error('stub type has no executor');
  }
  return executor(executorOptions(specVersion));
};

const services = (specVersion?: string) => ({
  configurationUtilities: actionsConfigMock.create(),
  ...(specVersion ? { specVersion } : {}),
});

describe('createVersionedConnectorType', () => {
  const build = (versions: string[]) => {
    const stubs = versions.map((version) => createStubType(version));
    const versioned = createVersionedConnectorType({
      id: ID,
      versions: stubs.map(({ version, type }) => ({ version, type })),
    });
    return { stubs, versioned, byVersion: Object.fromEntries(stubs.map((s) => [s.version, s])) };
  };

  describe('executor', () => {
    test('runs only the executor of the pinned version, with its global auth headers', async () => {
      const { versioned, byVersion } = build(['1.0', '1.1']);

      const result = await run(versioned, '1.0');

      expect(result).toEqual({ status: 'ok', actionId: 'ran-1.0' });
      expect(byVersion['1.0'].executor).toHaveBeenCalledTimes(1);
      expect(byVersion['1.0'].executor).toHaveBeenCalledWith(
        expect.objectContaining({
          specVersion: '1.0',
          globalAuthHeaders: { 'x-version': '1.0' },
        })
      );
      expect(byVersion['1.1'].executor).not.toHaveBeenCalled();
    });

    test('runs the newest 1.y without a version, even when a 2.x exists', async () => {
      const { versioned, byVersion } = build(['1.0', '1.2', '2.0']);

      await run(versioned);

      expect(byVersion['1.2'].executor).toHaveBeenCalledTimes(1);
      expect(byVersion['1.0'].executor).not.toHaveBeenCalled();
      expect(byVersion['2.0'].executor).not.toHaveBeenCalled();
    });

    test('throws not_loaded and runs nothing when the version is missing', async () => {
      const { versioned, stubs } = build(['1.0', '1.1']);

      await expect(run(versioned, '1.5')).rejects.toMatchObject({
        name: 'SpecVersionUnavailableError',
        reason: 'not_loaded',
        specVersion: '1.5',
        actionTypeId: ID,
      });
      for (const { executor } of stubs) {
        expect(executor).not.toHaveBeenCalled();
      }
    });

    test('throws not_loaded without a version when there is no 1.y', async () => {
      const { versioned, byVersion } = build(['2.0']);

      await expect(run(versioned)).rejects.toBeInstanceOf(SpecVersionUnavailableError);
      expect(byVersion['2.0'].executor).not.toHaveBeenCalled();
    });
  });

  describe('validators', () => {
    test.each(['config', 'secrets', 'params'] as const)(
      'resolveSchema returns the %s schema of the requested version',
      (key) => {
        const { versioned, byVersion } = build(['1.0', '1.1']);
        const { validate } = versioned.actionType;

        const schema = validate[key]?.resolveSchema?.(services('1.0'));

        expect(schema).toBe(byVersion['1.0'].type.validate[key]?.schema);
        expect(validate[key]?.resolveSchema?.(services('1.1'))).toBe(
          byVersion['1.1'].type.validate[key]?.schema
        );
      }
    );

    test.each(['config', 'secrets', 'params'] as const)(
      'customValidator of %s delegates to the requested version',
      (key) => {
        const { versioned, byVersion } = build(['1.0', '1.1']);
        const value = { a: 1 };
        const validatorServices = services('1.0');

        versioned.actionType.validate[key]?.customValidator?.(value, validatorServices);

        expect(byVersion['1.0'].type.validate[key]?.customValidator).toHaveBeenCalledWith(
          value,
          validatorServices
        );
        expect(byVersion['1.1'].type.validate[key]?.customValidator).not.toHaveBeenCalled();
      }
    );

    test('resolveSchema throws not_loaded for a version that is not present', () => {
      const { versioned } = build(['1.0']);

      expect(() => versioned.actionType.validate.config.resolveSchema?.(services('1.4'))).toThrow(
        SpecVersionUnavailableError
      );
    });

    test('schema and resolveSchema without a version use the default version', () => {
      const { versioned, byVersion } = build(['1.0', '1.1', '2.0']);
      const { config } = versioned.actionType.validate;

      expect(config.schema).toBe(byVersion['1.1'].type.validate.config.schema);
      expect(config.resolveSchema?.(services())).toBe(byVersion['1.1'].type.validate.config.schema);
    });
  });

  describe('specVersions', () => {
    test('getLatestVersions returns the latest accepted version per major', () => {
      const { versioned } = build(['1.0', '1.3', '1.2', '2.0']);

      expect(versioned.actionType.specVersions?.getLatestVersions()).toEqual({
        '1': '1.3',
        '2': '2.0',
      });
    });

    test('resolveExecutionVersion returns the pin when it is present', () => {
      const { versioned } = build(['1.0', '1.1']);

      expect(versioned.actionType.specVersions?.resolveExecutionVersion('1.0')).toBe('1.0');
    });

    test('resolveExecutionVersion without a pin returns the newest 1.y', () => {
      const { versioned } = build(['1.0', '1.2', '2.0']);

      expect(versioned.actionType.specVersions?.resolveExecutionVersion()).toBe('1.2');
    });

    test('resolveExecutionVersion throws when the pin or the 1.y is missing', () => {
      const { versioned } = build(['1.0']);
      const { specVersions } = versioned.actionType;

      expect(() => specVersions?.resolveExecutionVersion('1.1')).toThrow(
        SpecVersionUnavailableError
      );
      expect(() =>
        build(['2.0']).versioned.actionType.specVersions?.resolveExecutionVersion()
      ).toThrow(SpecVersionUnavailableError);
    });

    test('the no-pin default equals the version create stores without spec_version', () => {
      const { versioned } = build(['1.0', '1.2', '2.0']);
      const { actionType } = versioned;

      const { resolvedSpecVersion } = resolveConnectorSpecVersion({
        // The registry hands out the same entry typed as ActionType.
        actionType: actionType as ActionType,
        specVersion: undefined,
        configurationUtilities: actionsConfigMock.create(),
      });

      expect(actionType.specVersions?.resolveExecutionVersion()).toBe(resolvedSpecVersion);
    });
  });

  describe('addVersion', () => {
    test('moves spec, specs and the latest version per major, and keeps name and license', () => {
      const { versioned, byVersion } = build(['1.0']);
      const { actionType } = versioned;
      const { name, minimumLicenseRequired, description } = actionType;
      expect(actionType.spec).toBe(byVersion['1.0'].type.spec);
      expect(actionType.isTestable).toBe(false);

      const added = createStubType('1.1', {
        name: 'Renamed',
        minimumLicenseRequired: 'platinum',
      });
      versioned.addVersion(added);

      expect(versioned.hasVersion('1.1')).toBe(true);
      expect(actionType.spec).toBe(added.type.spec);
      expect([...(actionType.specs?.keys() ?? [])]).toEqual(['1.0', '1.1']);
      expect(actionType.specs?.get('1.1')).toBe(added.type.spec);
      expect(actionType.specVersions?.getLatestVersions()).toEqual({ '1': '1.1' });
      expect(actionType.isTestable).toBe(true);
      expect(actionType.globalAuthHeaders).toEqual({ 'x-version': '1.1' });
      expect(actionType.sandboxSupportedAuthTypes).toEqual(['auth-1.1']);
      expect(actionType.getSandboxHosts?.({ config: {} })).toEqual(['host-1.1']);
      expect(actionType.name).toBe(name);
      expect(actionType.minimumLicenseRequired).toBe(minimumLicenseRequired);
      expect(actionType.description).toBe(description);
    });

    test('ignores a version that is already present', async () => {
      const { versioned, byVersion } = build(['1.0']);
      const duplicate = createStubType('1.0');

      versioned.addVersion(duplicate);
      await run(versioned, '1.0');

      expect(byVersion['1.0'].executor).toHaveBeenCalledTimes(1);
      expect(duplicate.executor).not.toHaveBeenCalled();
      expect(versioned.actionType.spec).toBe(byVersion['1.0'].type.spec);
    });
  });

  describe('input checks', () => {
    test('throws without versions', () => {
      expect(() => createVersionedConnectorType({ id: ID, versions: [] })).toThrow();
    });

    test('throws when a built type has another id', () => {
      const other = createStubType('1.0', { id: '.other' });

      expect(() => createVersionedConnectorType({ id: ID, versions: [other] })).toThrow(/\.other/);
    });

    test('throws when a built type has no spec', () => {
      const noSpec: BuiltSpecVersion = createStubType('1.0', { spec: undefined });

      expect(() => createVersionedConnectorType({ id: ID, versions: [noSpec] })).toThrow(/spec/);
    });

    test('throws when the version is not major.minor', () => {
      expect(() =>
        createVersionedConnectorType({ id: ID, versions: [createStubType('1.1.0')] })
      ).toThrow(/1\.1\.0/);
      expect(() =>
        createVersionedConnectorType({ id: ID, versions: [createStubType('0.3')] })
      ).toThrow(/0\.3/);
    });
  });
});
