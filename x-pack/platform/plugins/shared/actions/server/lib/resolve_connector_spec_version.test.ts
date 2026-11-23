/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import type { ConnectorSpec } from '@kbn/connector-specs';
import { z } from '@kbn/zod/v4';
import { CONNECTOR_SPEC_VERSION_MAX_LENGTH } from '../../common';
import { actionsConfigMock } from '../actions_config.mock';
import { getConnectorType } from '../fixtures';
import type { ActionType } from '../types';
import { resolveConnectorSpecVersion } from './resolve_connector_spec_version';
import { validateConfig, validateSecrets } from './validate_with_schema';

describe('resolveConnectorSpecVersion', () => {
  const firstSpec: ConnectorSpec = {
    metadata: {
      id: 'my-connector-type',
      displayName: 'Versioned connector',
      description: 'A connector with versioned schemas',
      minimumLicense: 'basic',
      supportedFeatureIds: ['alerting'],
    },
    schema: z.object({
      endpoint: z.string().meta({ validate: { allowedHosts: true } }),
      retries: z.number().default(3),
    }),
    auth: { types: ['api_key_header'] },
    actions: {},
    test: { enabled: false, handler: jest.fn() },
  };
  const secondSpec: ConnectorSpec = {
    ...firstSpec,
    schema: z.object({ region: z.string() }),
    auth: { types: ['basic'] },
  };

  let actionType: ActionType;
  let specs: Map<string, ConnectorSpec>;
  let configurationUtilities: ReturnType<typeof actionsConfigMock.create>;

  beforeEach(() => {
    configurationUtilities = actionsConfigMock.create();
    specs = new Map([
      ['2.1', secondSpec],
      ['1.10', firstSpec],
      ['1.9', firstSpec],
      ['1.3', firstSpec],
      ['2.0', secondSpec],
    ]);
    actionType = getConnectorType({
      source: ACTION_TYPE_SOURCES.spec,
      spec: secondSpec,
      specs,
      validate: {
        config: { schema: z.object({ unrelated: z.string() }) },
        secrets: { schema: z.object({ unrelated: z.string() }) },
        params: { schema: z.object({}) },
        connector: jest.fn().mockReturnValue(null),
      },
    });
  });

  test.each([
    [undefined, '1.10'],
    ['1', '1.10'],
    ['1.3', '1.3'],
    ['2', '2.1'],
    ['2.0', '2.0'],
  ])('resolves selector %s to exact version %s', (specVersion, expectedVersion) => {
    const { resolvedSpecVersion } = resolveConnectorSpecVersion({
      actionType,
      specVersion,
      configurationUtilities,
    });

    expect(resolvedSpecVersion).toBe(expectedVersion);
  });

  test('compares minors beyond the safe integer range without losing precision', () => {
    actionType.specs = new Map([
      ['1.999254740992', firstSpec],
      ['1.999254740993', firstSpec],
    ]);

    const { resolvedSpecVersion } = resolveConnectorSpecVersion({
      actionType,
      specVersion: '1',
      configurationUtilities,
    });

    expect(resolvedSpecVersion).toBe('1.999254740993');
  });

  test('ignores malformed and oversized registry keys when selecting the latest minor', () => {
    specs.set('1.99.0', firstSpec);
    specs.set('1.100\n', firstSpec);
    specs.set(`1.${'9'.repeat(CONNECTOR_SPEC_VERSION_MAX_LENGTH - 1)}`, firstSpec);

    const { resolvedSpecVersion } = resolveConnectorSpecVersion({
      actionType,
      specVersion: '1',
      configurationUtilities,
    });

    expect(resolvedSpecVersion).toBe('1.10');
  });

  test('accepts an exact version at the maximum length', () => {
    const specVersion = `1.${'9'.repeat(CONNECTOR_SPEC_VERSION_MAX_LENGTH - 2)}`;
    specs.set(specVersion, firstSpec);

    const { resolvedSpecVersion } = resolveConnectorSpecVersion({
      actionType,
      specVersion,
      configurationUtilities,
    });

    expect(resolvedSpecVersion).toBe(specVersion);
  });

  test.each([
    '',
    'latest',
    '*',
    '0',
    '0.1',
    '^1',
    '1.x',
    '1.3.0',
    '1.3-beta',
    '1.3+build',
    '01',
    '1.03',
    '-1',
    '1.',
    ' 1',
    '1 ',
    '1\n',
    '1\r\n',
    `1.${'9'.repeat(CONNECTOR_SPEC_VERSION_MAX_LENGTH - 1)}`,
  ])('rejects invalid selector %j with a bad request', (specVersion) => {
    expect(() =>
      resolveConnectorSpecVersion({ actionType, specVersion, configurationUtilities })
    ).toThrow(
      expect.objectContaining({
        message: expect.stringContaining('Invalid spec_version'),
        output: expect.objectContaining({ statusCode: 400 }),
      })
    );
  });

  test.each(['3', '1.8'])('names unknown version %s in the bad request', (specVersion) => {
    expect(() =>
      resolveConnectorSpecVersion({ actionType, specVersion, configurationUtilities })
    ).toThrow(
      expect.objectContaining({
        message: `Unknown spec_version "${specVersion}" for connector type "${actionType.id}".`,
        output: expect.objectContaining({ statusCode: 400 }),
      })
    );
  });

  test.each([
    { name: 'empty map', registeredSpecs: new Map<string, ConnectorSpec>() },
    { name: 'only major 2', registeredSpecs: new Map([['2.1', secondSpec]]) },
  ])('rejects the default major when the registry has $name', ({ registeredSpecs }) => {
    actionType.specs = registeredSpecs;

    expect(() => resolveConnectorSpecVersion({ actionType, configurationUtilities })).toThrow(
      expect.objectContaining({
        message: `Unknown spec_version "1" for connector type "${actionType.id}".`,
        output: expect.objectContaining({ statusCode: 400 }),
      })
    );
  });

  test.each([
    { name: 'classic', spec: undefined },
    { name: 'single-spec', spec: firstSpec },
  ])('preserves an unversioned $name action type', ({ spec }) => {
    const unversionedActionType = {
      ...actionType,
      source: spec ? ACTION_TYPE_SOURCES.spec : ACTION_TYPE_SOURCES.stack,
      spec,
      specs: undefined,
    };

    const { resolvedSpecVersion, actionTypeForValidation } = resolveConnectorSpecVersion({
      actionType: unversionedActionType,
      configurationUtilities,
    });

    expect(resolvedSpecVersion).toBeUndefined();
    expect(actionTypeForValidation).toBe(unversionedActionType);
    expect(configurationUtilities.getWebhookSettings).not.toHaveBeenCalled();
  });

  test.each([
    { name: 'classic', spec: undefined },
    { name: 'single-spec', spec: firstSpec },
  ])('rejects an explicit version for an unversioned $name action type', ({ spec }) => {
    expect(() =>
      resolveConnectorSpecVersion({
        actionType: {
          ...actionType,
          source: spec ? ACTION_TYPE_SOURCES.spec : ACTION_TYPE_SOURCES.stack,
          spec,
          specs: undefined,
        },
        specVersion: '1',
        configurationUtilities,
      })
    ).toThrow(
      expect.objectContaining({
        message: `Unknown spec_version "1" for connector type "${actionType.id}".`,
        output: expect.objectContaining({ statusCode: 400 }),
      })
    );
  });

  test('builds config and secrets validators from the requested spec', () => {
    const { actionTypeForValidation } = resolveConnectorSpecVersion({
      actionType,
      specVersion: '1.3',
      configurationUtilities,
    });

    expect(
      validateConfig(
        actionTypeForValidation,
        { endpoint: 'https://example.com' },
        { configurationUtilities }
      )
    ).toEqual({ endpoint: 'https://example.com', retries: 3 });
    expect(
      validateSecrets(
        actionTypeForValidation,
        { authType: 'api_key_header', apiKey: 'secret' },
        { configurationUtilities }
      )
    ).toEqual({ authType: 'api_key_header', apiKey: 'secret', headerField: 'Api-Key' });
    expect(configurationUtilities.ensureUriAllowed).toHaveBeenCalledWith('https://example.com');
    expect(() =>
      validateConfig(actionTypeForValidation, { region: 'west' }, { configurationUtilities })
    ).toThrow('error validating connector type config');
    expect(() =>
      validateSecrets(
        actionTypeForValidation,
        { authType: 'basic', username: 'user', password: 'secret' },
        { configurationUtilities }
      )
    ).toThrow('error validating connector type secrets');
  });

  test('preserves custom validation from the selected spec', () => {
    configurationUtilities.ensureUriAllowed.mockImplementation(() => {
      throw new Error('Host is not allowed');
    });
    const { actionTypeForValidation } = resolveConnectorSpecVersion({
      actionType,
      specVersion: '1.3',
      configurationUtilities,
    });

    expect(() =>
      validateConfig(
        actionTypeForValidation,
        { endpoint: 'https://example.com' },
        { configurationUtilities }
      )
    ).toThrow('Host is not allowed');
  });

  test('keeps each resolution independent and leaves the registered type unchanged', () => {
    const { validate, executor } = actionType;
    const registeredSpecs = new Map(specs);
    Object.freeze(actionType);
    Object.freeze(validate);

    const { actionTypeForValidation: firstType } = resolveConnectorSpecVersion({
      actionType,
      specVersion: '1',
      configurationUtilities,
    });
    const { actionTypeForValidation: secondType } = resolveConnectorSpecVersion({
      actionType,
      specVersion: '2',
      configurationUtilities,
    });

    expect(firstType).not.toBe(actionType);
    expect(secondType).not.toBe(firstType);
    expect(actionType.validate).toBe(validate);
    expect(actionType.specs).toBe(specs);
    expect(specs).toEqual(registeredSpecs);
    expect(actionType.spec).toBe(secondSpec);
    expect(firstType.validate.params).toBe(validate.params);
    expect(firstType.validate.connector).toBe(validate.connector);
    expect(firstType.executor).toBe(executor);
    expect(
      validateConfig(firstType, { endpoint: 'https://example.com' }, { configurationUtilities })
    ).toEqual({ endpoint: 'https://example.com', retries: 3 });
    expect(validateConfig(secondType, { region: 'west' }, { configurationUtilities })).toEqual({
      region: 'west',
    });
    expect(
      validateSecrets(
        secondType,
        { authType: 'basic', username: 'user', password: 'secret' },
        { configurationUtilities }
      )
    ).toEqual({ authType: 'basic', username: 'user', password: 'secret' });
    expect(() => validate.config.schema.parse({ endpoint: 'https://example.com' })).toThrow();
  });
});
