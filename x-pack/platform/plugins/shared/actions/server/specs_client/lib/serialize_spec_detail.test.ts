/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z as z4 } from '@kbn/zod/v4';
import type { ActionsConfigurationUtilities } from '../../actions_config';
import { serializeSpecDetail } from './serialize_spec_detail';
import { createActionType, createExperimentalEarsSpec, createSpec } from '../test_utils';

const listRow = (id: string) => createActionType(id);

const createConfigurationUtilities = (isEarsExperimentalEnabled = false) =>
  ({
    getWebhookSettings: () => ({ ssl: { pfx: { enabled: true } } }),
    isEarsEnabled: () => false,
    isEarsExperimentalEnabled: () => isEarsExperimentalEnabled,
  } as unknown as ActionsConfigurationUtilities);

const stubWithAction = createSpec({
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
});

const stubExperimentalEars = createExperimentalEarsSpec();

const stubUnserializable = createSpec({
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
});

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
  it('includes formSchema, skill, and action inputSchema', () => {
    const detail = serializeSpecDetail(
      { spec: stubWithAction, type: listRow('.stub-detail') },
      createConfigurationUtilities()
    );

    expect(detail).toMatchObject({
      skill: 'Use listThings to search.',
      formSchema: expect.objectContaining({
        properties: expect.objectContaining({
          config: expect.any(Object),
          secrets: expect.any(Object),
        }),
      }),
    });
    expect(detail.actions).toEqual([
      expect.objectContaining({
        name: 'listThings',
        inputSchema: expect.objectContaining({
          type: expect.any(String),
          properties: expect.any(Object),
        }),
      }),
    ]);
  });

  it('omits skill when the spec does not define one', () => {
    const detail = serializeSpecDetail(
      { spec: stubExperimentalEars, type: listRow('.stub-experimental-ears') },
      createConfigurationUtilities()
    );
    expect(detail).not.toHaveProperty('skill');
  });

  it.each([false, true])(
    'includes experimental EARS auth types only when the feature is enabled (%s)',
    (isEnabled) => {
      const configuration = {
        ...createConfigurationUtilities(isEnabled),
        isEarsEnabled: () => true,
      } as ActionsConfigurationUtilities;
      const detail = serializeSpecDetail(
        { spec: stubExperimentalEars, type: listRow('.stub-experimental-ears') },
        configuration
      );

      expect(secretsAuthTypes(detail.formSchema).includes('ears')).toBe(isEnabled);
    }
  );

  it('wraps serialization failures', () => {
    expect(() =>
      serializeSpecDetail(
        { spec: stubUnserializable, type: listRow('.stub-bad-input') },
        createConfigurationUtilities()
      )
    ).toThrow(/Failed to serialize connector spec:/);
  });
});
