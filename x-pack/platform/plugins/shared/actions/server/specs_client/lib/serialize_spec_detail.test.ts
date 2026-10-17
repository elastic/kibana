/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';
import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import { z as z4 } from '@kbn/zod/v4';
import type { ActionType } from '../../../common';
import type { ActionsConfigurationUtilities } from '../../actions_config';
import { serializeSpecDetail } from './serialize_spec_detail';

const listRow = (id: string, overrides: Partial<ActionType> = {}): ActionType => ({
  id,
  name: id,
  enabled: true,
  enabledInConfig: true,
  enabledInLicense: true,
  minimumLicenseRequired: 'basic',
  supportedFeatureIds: [],
  isSystemActionType: false,
  source: ACTION_TYPE_SOURCES.spec,
  isDeprecated: false,
  ...overrides,
});

const configurationUtilities = {
  getWebhookSettings: () => ({ ssl: { pfx: { enabled: true } } }),
  isEarsEnabled: () => false,
  isEarsExperimentalEnabled: () => false,
} as unknown as ActionsConfigurationUtilities;

const stubWithAction = {
  metadata: {
    id: '.stub-detail',
    displayName: 'Stub Detail',
    description: 'Detail serializer stub',
    minimumLicense: 'gold',
    supportedFeatureIds: ['workflows'],
  },
  auth: { types: ['none'] },
  schema: z4.object({ url: z4.string() }),
  actions: {
    listThings: {
      isTool: true,
      description: 'List things',
      scope: 'read',
      input: z4.object({ q: z4.string() }),
      handler: async () => ({}),
    },
  },
  test: { handler: async () => ({}), enabled: true },
  skill: 'Use listThings to search.',
} as unknown as ConnectorSpec;

const stubExperimentalEars = {
  metadata: {
    id: '.stub-experimental-ears',
    displayName: 'Stub (experimental EARS)',
    description: 'Experimental EARS auth',
    minimumLicense: 'basic',
    supportedFeatureIds: [],
  },
  auth: {
    types: [{ type: 'ears', isExperimental: true, defaults: {} }],
  },
  schema: null,
  actions: {},
  test: { handler: async () => ({}), enabled: true },
} as unknown as ConnectorSpec;

const stubUnserializable = {
  metadata: {
    id: '.stub-bad-input',
    displayName: 'Stub Bad Input',
    description: 'Action input is not a Zod schema',
    minimumLicense: 'basic',
    supportedFeatureIds: [],
  },
  auth: null,
  schema: null,
  actions: {
    broken: {
      scope: 'read',
      input: {},
      handler: async () => ({}),
    },
  },
  test: { handler: async () => ({}), enabled: false },
} as unknown as ConnectorSpec;

const secretsAuthTypes = (formSchema: Record<string, unknown>): string[] => {
  const schemaJson = formSchema as {
    properties?: {
      secrets?: { oneOf?: Array<{ properties?: { authType?: { const?: string } } }> };
    };
  };
  const secretsOneOf = schemaJson.properties?.secrets?.oneOf || [];
  return secretsOneOf.map((opt) => opt.properties?.authType?.const).filter(Boolean) as string[];
};

describe('serializeSpecDetail', () => {
  it('includes summary fields, formSchema, skill, and action inputSchema', () => {
    const detail = serializeSpecDetail(
      { spec: stubWithAction, type: listRow('.stub-detail') },
      configurationUtilities
    );

    expect(detail.id).toBe('.stub-detail');
    expect(detail.displayName).toBe('Stub Detail');
    expect(detail.skill).toBe('Use listThings to search.');
    expect(detail.formSchema).toEqual(
      expect.objectContaining({
        properties: expect.objectContaining({
          config: expect.any(Object),
          secrets: expect.any(Object),
        }),
      })
    );
    expect(detail.actions).toHaveLength(1);
    expect(detail.actions[0].name).toBe('listThings');
    expect(detail.actions[0].inputSchema).toEqual(
      expect.objectContaining({
        type: expect.any(String),
        properties: expect.any(Object),
      })
    );
    expect(JSON.stringify(detail.actions[0].inputSchema)).toEqual(
      JSON.stringify(JSON.parse(JSON.stringify(detail.actions[0].inputSchema)))
    );
  });

  it('omits skill when the spec does not define one', () => {
    const detail = serializeSpecDetail(
      { spec: stubExperimentalEars, type: listRow('.stub-experimental-ears') },
      configurationUtilities
    );
    expect(detail).not.toHaveProperty('skill');
  });

  it('excludes experimental EARS auth types when isEarsExperimentalEnabled is false', () => {
    const earsEnabledUtils = {
      getWebhookSettings: () => ({ ssl: { pfx: { enabled: true } } }),
      isEarsEnabled: () => true,
      isEarsExperimentalEnabled: () => false,
    } as unknown as ActionsConfigurationUtilities;

    const detail = serializeSpecDetail(
      { spec: stubExperimentalEars, type: listRow('.stub-experimental-ears') },
      earsEnabledUtils
    );

    expect(secretsAuthTypes(detail.formSchema)).not.toContain('ears');
  });

  it('includes experimental EARS auth types when isEarsExperimentalEnabled is true', () => {
    const earsEnabledUtils = {
      getWebhookSettings: () => ({ ssl: { pfx: { enabled: true } } }),
      isEarsEnabled: () => true,
      isEarsExperimentalEnabled: () => true,
    } as unknown as ActionsConfigurationUtilities;

    const detail = serializeSpecDetail(
      { spec: stubExperimentalEars, type: listRow('.stub-experimental-ears') },
      earsEnabledUtils
    );

    expect(secretsAuthTypes(detail.formSchema)).toContain('ears');
  });

  it('wraps serialization failures', () => {
    expect(() =>
      serializeSpecDetail(
        { spec: stubUnserializable, type: listRow('.stub-bad-input') },
        configurationUtilities
      )
    ).toThrow(/Failed to serialize connector spec:/);
  });
});
