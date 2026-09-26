/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { PluginSetupContract as ActionsPluginSetupContract } from '../plugin';
import type { ActionTypeExecutorOptions, ValidatorServices } from '../types';
import { createConnectorTypeFromSpec } from '../lib/single_file_connectors/create_connector_from_spec';
import type { ConnectorSpec } from '@kbn/connector-specs';
import { z } from '@kbn/zod/v4';
import { buildVersion } from './build_version';
import { ABUSE_IPDB_SPEC_FIXTURE, TYPE_METADATA_FIXTURE } from './test_fixtures';
import type { CatalogActionType } from './types';
import { createVersionedConnectorType } from './versioned_connector_type';
import { SpecVersionRequestError } from '../lib/errors/spec_version_request_error';

jest.mock('../lib/single_file_connectors/create_connector_from_spec', () => ({
  createConnectorTypeFromSpec: jest.fn(),
}));

const mockedCreateType = createConnectorTypeFromSpec as jest.MockedFunction<
  typeof createConnectorTypeFromSpec
>;

const actions = {} as ActionsPluginSetupContract;
const logger = loggerMock.create();

const yamlFor = (version: string): string =>
  ABUSE_IPDB_SPEC_FIXTURE.replace(/version: ["']?\d+\.\d+(?:\.\d+)?["']?/, `version: "${version}"`);

const materialize = (yaml: string) => buildVersion(yaml);

const fakeTypeFor = (spec: ConnectorSpec): CatalogActionType => ({
  id: spec.metadata.id,
  name: spec.metadata.displayName,
  minimumLicenseRequired: spec.metadata.minimumLicense,
  supportedFeatureIds: spec.metadata.supportedFeatureIds,
  connectorSpec: spec,
  isTestable: spec.test.enabled,
  validate: {
    config: {
      schema: z.object({ baseUrl: z.string().optional() }),
      customValidator: jest.fn(),
    },
    secrets: { schema: z.object({ apiKey: z.string() }) },
    params: { schema: z.object({ subAction: z.string() }) },
  },
  executor: jest.fn(async (options) => ({
    actionId: options.actionId,
    status: 'ok' as const,
    data: { servedBy: spec.metadata.displayName },
  })),
});

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

  const createType = (versions: string[]) =>
    createVersionedConnectorType({
      id: '.abuseipdb',
      versions: versions.map((version) => materialize(yamlFor(version))),
      metadata: TYPE_METADATA_FIXTURE,
      actions,
      logger,
    });

  it('tracks accepted latest per major and reads live type metadata', () => {
    const type = createType(['1.0', '1.1', '2.0']);
    expect(type.actionType.id).toBe('.abuseipdb');
    expect(type.getLatestVersions()).toEqual({ '1': '1.1', '2': '2.0' });
    expect(type.getLatestVersion()).toBe('2.0');
    expect(type.getLatestVersion(1)).toBe('1.1');
    expect(type.actionType.name).toBe('AbuseIPDB');
    expect(type.actionType.specVersions?.getLatestVersion()).toBe('2.0');
  });

  it('updates metadata in place', () => {
    const type = createType(['1.0']);
    type.updateMetadata({
      ...TYPE_METADATA_FIXTURE,
      displayName: 'AbuseIPDB Cloud',
      minimumLicense: 'enterprise',
    });
    expect(type.actionType.name).toBe('AbuseIPDB Cloud');
    expect(type.actionType.minimumLicenseRequired).toBe('enterprise');
    expect(type.actionType.connectorSpec?.metadata.displayName).toBe('AbuseIPDB Cloud');
  });

  it('moves latest-per-major when a higher minor is added', () => {
    const type = createType(['1.0']);
    type.addVersion(materialize(yamlFor('1.1')));
    expect(type.getLatestVersion(1)).toBe('1.1');
  });

  it('resolves omitted create requests to the newest accepted 1.y', async () => {
    const type = createType(['1.0', '1.1', '2.0']);
    await expect(type.actionType.specVersions?.resolveRequest(undefined)).resolves.toBe('1.1');
    await expect(type.actionType.specVersions?.resolveRequest('2')).resolves.toBe('2.0');
    await expect(type.actionType.specVersions?.resolveRequest('1.0')).resolves.toBe('1.0');
    await expect(type.actionType.specVersions?.resolveRequest(undefined, 2)).resolves.toBe('2.0');
  });

  it('does not warn when executing an unpinned connector', async () => {
    const type = createType(['1.0', '1.1']);
    const result = await type.actionType.executor?.(executorOptions('c2'));
    expect(result?.status).toBe('ok');
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('dispatches validation on the pinned version and uses major 1 when unpinned', () => {
    const type = createType(['1.0', '1.1']);
    const { config } = type.actionType.validate;
    expect(config.resolveSchema?.(services('1.0'))).toBeDefined();
    expect(config.schema).toBeDefined();
  });

  it('builds an exact version on demand via loadVersion', async () => {
    const loadVersion = jest.fn(async () => materialize(yamlFor('1.1')));
    const type = createVersionedConnectorType({
      id: '.abuseipdb',
      versions: [materialize(yamlFor('1.0'))],
      metadata: TYPE_METADATA_FIXTURE,
      actions,
      logger,
      loadVersion,
    });
    const spec = await type.actionType.specVersions?.getSpec('1.1');
    expect(loadVersion).toHaveBeenCalledWith('.abuseipdb', '1.1');
    expect(spec?.metadata.displayName).toBe('AbuseIPDB');
    expect(type.hasVersion('1.1')).toBe(true);
    expect(type.getLatestVersion(1)).toBe('1.1');
  });

  it('fails closed when an exact version is not stored', async () => {
    const loadVersion = jest.fn(async () => {
      throw new Error('Spec definition:.abuseipdb@9.9 is not stored in the index');
    });
    const type = createVersionedConnectorType({
      id: '.abuseipdb',
      versions: [materialize(yamlFor('1.0'))],
      metadata: TYPE_METADATA_FIXTURE,
      actions,
      logger,
      loadVersion,
    });
    await expect(type.actionType.specVersions?.getSpec('9.9')).rejects.toBeInstanceOf(
      SpecVersionRequestError
    );
  });

  it('refuses to add a spec of another id', () => {
    const type = createType(['1.0']);
    expect(() =>
      type.addVersion(materialize(yamlFor('1.0').replace('id: .abuseipdb', 'id: .otheripdb')))
    ).toThrow('cannot serve spec ".otheripdb@1.0"');
  });
});
