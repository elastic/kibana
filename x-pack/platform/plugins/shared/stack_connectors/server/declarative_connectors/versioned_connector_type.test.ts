/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';
import type {
  ActionTypeExecutorOptions,
  CatalogActionType,
  ValidatorServices,
} from '@kbn/actions-plugin/server';
import { createConnectorTypeFromSpec } from '@kbn/actions-plugin/server/lib';
import type { ConnectorSpec } from '@kbn/connector-specs';
import { z } from '@kbn/zod/v4';
import type { MaterializedSpec } from './load_declarative_specs';
import { materializeDeclarativeAsset } from './load_declarative_specs';
import { ABUSE_IPDB_SPEC_FIXTURE, CONNECTOR_ICON_FIXTURE } from './test_fixtures';
import { createVersionedConnectorType } from './versioned_connector_type';

jest.mock('@kbn/actions-plugin/server/lib', () => ({
  createConnectorTypeFromSpec: jest.fn(),
}));

const mockedCreateType = createConnectorTypeFromSpec as jest.MockedFunction<
  typeof createConnectorTypeFromSpec
>;

const actions = {} as ActionsPluginSetupContract;
const logger = loggerMock.create();

const V1_YAML = ABUSE_IPDB_SPEC_FIXTURE;
const V2_YAML = ABUSE_IPDB_SPEC_FIXTURE.replace('version: 1.0.0', 'version: 1.1.0').replace(
  'description: Test AbuseIPDB connector',
  'description: Test AbuseIPDB connector v1.1.0'
);

const materialize = (yaml: string): MaterializedSpec =>
  materializeDeclarativeAsset({ yamlPath: 'abuseipdb.yaml', yaml, icon: CONNECTOR_ICON_FIXTURE });

/** Fake per-version type: config schema requires `version` to equal the spec version. */
const fakeTypeFor = (spec: ConnectorSpec): CatalogActionType => {
  const version = spec.metadata.description?.endsWith('v1.1.0') ? '1.1.0' : '1.0.0';
  return {
    id: spec.metadata.id,
    name: `${spec.metadata.displayName} ${version}`,
    minimumLicenseRequired: 'gold',
    supportedFeatureIds: ['workflows'],
    connectorSpec: spec,
    validate: {
      config: {
        schema: z.object({ version: z.literal(version) }),
        customValidator: jest.fn(),
      },
      secrets: { schema: z.object({ apiKey: z.string() }) },
      params: { schema: z.object({ subAction: z.string() }) },
    },
    executor: jest.fn(async (options) => ({
      actionId: options.actionId,
      status: 'ok' as const,
      data: { servedBy: version },
    })),
  };
};

const services = (specVersion?: string): ValidatorServices =>
  ({ configurationUtilities: {}, specVersion } as unknown as ValidatorServices);

const executorOptions = (actionId: string, specVersion?: string) =>
  ({
    actionId,
    params: {},
    config: {},
    secrets: {},
    specVersion,
  } as unknown as ActionTypeExecutorOptions<
    Record<string, unknown>,
    Record<string, unknown>,
    Record<string, unknown>
  >);

describe('createVersionedConnectorType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCreateType.mockImplementation((spec) => fakeTypeFor(spec));
  });

  it('builds one action type per id and exposes active-version fields through getters', () => {
    const type = createVersionedConnectorType({
      id: '.abuseipdb',
      versions: [materialize(V1_YAML), materialize(V2_YAML)],
      activeVersion: '1.0.0',
      actions,
      logger,
    });

    expect(type.actionType.id).toBe('.abuseipdb');
    expect(type.actionType.name).toBe('AbuseIPDB 1.0.0');
    expect(type.actionType.specVersions?.getActiveVersion()).toBe('1.0.0');
    expect(type.getVersions()).toEqual(['1.0.0', '1.1.0']);

    type.setActiveVersion('1.1.0');
    expect(type.actionType.name).toBe('AbuseIPDB 1.1.0');
    expect(type.actionType.connectorSpec?.metadata.description).toContain('v1.1.0');
    expect(type.actionType.specVersions?.getActiveSpec().metadata.description).toContain('v1.1.0');
  });

  it('rejects an active version that is not materialized', () => {
    expect(() =>
      createVersionedConnectorType({
        id: '.abuseipdb',
        versions: [materialize(V1_YAML)],
        activeVersion: '1.1.0',
        actions,
        logger,
      })
    ).toThrow('no materialized active version "1.1.0"');
  });

  it('dispatches validation on the pinned version and falls back to active when unpinned', () => {
    const type = createVersionedConnectorType({
      id: '.abuseipdb',
      versions: [materialize(V1_YAML), materialize(V2_YAML)],
      activeVersion: '1.1.0',
      actions,
      logger,
    });
    const { config } = type.actionType.validate;

    expect(config.resolveSchema?.(services('1.0.0')).parse({ version: '1.0.0' })).toEqual({
      version: '1.0.0',
    });
    expect(() => config.resolveSchema?.(services('1.0.0')).parse({ version: '1.1.0' })).toThrow();
    expect(config.resolveSchema?.(services(undefined)).parse({ version: '1.1.0' })).toEqual({
      version: '1.1.0',
    });
    expect(config.schema.parse({ version: '1.1.0' })).toEqual({ version: '1.1.0' });

    config.customValidator?.({ version: '1.0.0' }, services('1.0.0'));
    const v1Type = mockedCreateType.mock.results[0].value as CatalogActionType;
    expect(v1Type.validate.config.customValidator).toHaveBeenCalledTimes(1);
  });

  it('throws from validators when the pinned version is not loaded', () => {
    const type = createVersionedConnectorType({
      id: '.abuseipdb',
      versions: [materialize(V1_YAML)],
      activeVersion: '1.0.0',
      actions,
      logger,
    });
    expect(() => type.actionType.validate.config.resolveSchema?.(services('9.9.9'))).toThrow(
      'Spec version "9.9.9" of connector type ".abuseipdb" is not loaded on this node.'
    );
  });

  it('executes on the pinned version with two versions registered', async () => {
    const type = createVersionedConnectorType({
      id: '.abuseipdb',
      versions: [materialize(V1_YAML), materialize(V2_YAML)],
      activeVersion: '1.1.0',
      actions,
      logger,
    });

    const pinned = await type.actionType.executor?.(executorOptions('c1', '1.0.0'));
    expect(pinned).toEqual({ actionId: 'c1', status: 'ok', data: { servedBy: '1.0.0' } });

    const unpinned = await type.actionType.executor?.(executorOptions('c2'));
    expect(unpinned).toEqual({ actionId: 'c2', status: 'ok', data: { servedBy: '1.1.0' } });
  });

  it('warns once per legacy connector id per process', async () => {
    const type = createVersionedConnectorType({
      id: '.abuseipdb',
      versions: [materialize(V1_YAML)],
      activeVersion: '1.0.0',
      actions,
      logger,
    });
    await type.actionType.executor?.(executorOptions('legacy-1'));
    await type.actionType.executor?.(executorOptions('legacy-1'));
    await type.actionType.executor?.(executorOptions('legacy-2'));

    expect(logger.warn).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('"legacy-1"'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('"legacy-2"'));
  });

  it('lazy loads a missing version once and then serves it', async () => {
    const loadVersion = jest.fn(async () => materialize(V2_YAML));
    const type = createVersionedConnectorType({
      id: '.abuseipdb',
      versions: [materialize(V1_YAML)],
      activeVersion: '1.0.0',
      actions,
      logger,
      loadVersion,
    });

    const [first, second] = await Promise.all([
      type.actionType.specVersions?.getSpec('1.1.0'),
      type.actionType.executor?.(executorOptions('c1', '1.1.0')),
    ]);

    expect(loadVersion).toHaveBeenCalledTimes(1);
    expect(loadVersion).toHaveBeenCalledWith('.abuseipdb', '1.1.0');
    expect(first?.metadata.description).toContain('v1.1.0');
    expect(second).toEqual({ actionId: 'c1', status: 'ok', data: { servedBy: '1.1.0' } });
    expect(type.hasVersion('1.1.0')).toBe(true);
    expect(type.getActiveVersion()).toBe('1.0.0');
  });

  it('fails closed when the pinned version cannot be loaded', async () => {
    const loadVersion = jest.fn(async () => {
      throw new Error('definition:.abuseipdb@9.9.9 could not be obtained');
    });
    const type = createVersionedConnectorType({
      id: '.abuseipdb',
      versions: [materialize(V1_YAML)],
      activeVersion: '1.0.0',
      actions,
      logger,
      loadVersion,
    });

    await expect(type.actionType.executor?.(executorOptions('c1', '9.9.9'))).rejects.toThrow(
      'could not be obtained'
    );
    await expect(type.actionType.specVersions?.getSpec('9.9.9')).rejects.toThrow(
      'could not be obtained'
    );
    expect(type.hasVersion('9.9.9')).toBe(false);
  });

  it('fails closed without a loader', async () => {
    const type = createVersionedConnectorType({
      id: '.abuseipdb',
      versions: [materialize(V1_YAML)],
      activeVersion: '1.0.0',
      actions,
      logger,
    });
    await expect(type.actionType.specVersions?.getSpec('1.1.0')).rejects.toThrow(
      'Spec version "1.1.0" of connector type ".abuseipdb" is not available.'
    );
  });

  it('refuses to add a spec of another id', () => {
    const type = createVersionedConnectorType({
      id: '.abuseipdb',
      versions: [materialize(V1_YAML)],
      activeVersion: '1.0.0',
      actions,
      logger,
    });
    expect(() =>
      type.addVersion(materialize(V1_YAML.replace('id: .abuseipdb', 'id: .otheripdb')))
    ).toThrow('cannot serve spec ".otheripdb@1.0.0"');
  });
});
