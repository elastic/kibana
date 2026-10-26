/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z as z4 } from '@kbn/zod/v4';
import type { RegisteredSpec } from './get_registered_spec';
import { createActionType, createExperimentalEarsSpec, createSpec } from '../test_utils';
import {
  getAuthTypeIds,
  isEarsExperimentalSpec,
  serializeSpecSummary,
} from './serialize_spec_summary';

const listRow = (id: string) =>
  createActionType(id, {
    enabledInLicense: false,
    minimumLicenseRequired: 'gold',
    supportedFeatureIds: ['workflows'],
    isDeprecated: true,
  });

const stubWithStringAuth = createSpec({
  metadata: {
    id: '.stub-string-auth',
    displayName: 'Stub String Auth',
    description: 'Uses a string auth type',
    icon: 'logo',
    docsUrl: 'https://example.test',
    minimumLicense: 'gold',
    supportedFeatureIds: ['workflows'],
  },
  auth: { types: ['api_key_header'] },
  schema: null,
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
});

const stubWithObjectAuth = createSpec({
  metadata: {
    id: '.stub-object-auth',
    displayName: 'Stub Object Auth',
    description: 'Uses AuthTypeDef auth types',
    minimumLicense: 'basic',
    supportedFeatureIds: [],
  },
  auth: {
    types: [
      { type: 'basic', defaults: {} },
      { type: 'ears', isExperimental: false, defaults: {} },
    ],
  },
});

const stubExperimentalEars = createExperimentalEarsSpec();

const stubEventsOnly = createSpec({
  metadata: {
    id: '.stub-events-only',
    displayName: 'Stub Events Only',
    description: 'Inbound-only stub',
    minimumLicense: 'basic',
    supportedFeatureIds: [],
  },
  auth: null,
  events: {
    definitions: {
      ping: {
        eventId: '.stub-events-only.ping',
        title: 'Ping',
        description: 'Ping event',
        eventSchema: z4.object({}),
      },
    },
    handleEvents: async () => ({}),
  },
  test: { handler: async () => ({}), enabled: false },
});

const stubDual = createSpec({
  metadata: {
    id: '.stub-dual',
    displayName: 'Stub Dual',
    description: 'Actions and events',
    minimumLicense: 'basic',
    supportedFeatureIds: [],
  },
  auth: null,
  actions: {
    send: {
      isTool: false,
      input: z4.object({}),
      handler: async () => ({}),
    },
  },
  events: {
    definitions: {
      ping: {
        eventId: '.stub-dual.ping',
        title: 'Ping',
        description: 'Ping event',
        eventSchema: z4.object({}),
      },
    },
    handleEvents: async () => ({}),
  },
  test: { handler: async () => ({}), enabled: false },
});

const stubNoPreview = createSpec({ metadata: { id: '.stub-no-preview' } });

describe('getAuthTypeIds', () => {
  it('maps string auth types to themselves', () => {
    expect(getAuthTypeIds(stubWithStringAuth)).toEqual(['api_key_header']);
  });

  it('maps AuthTypeDef auth types to their type ids', () => {
    expect(getAuthTypeIds(stubWithObjectAuth)).toEqual(['basic', 'ears']);
  });

  it('returns an empty array when auth is missing', () => {
    expect(getAuthTypeIds(stubEventsOnly)).toEqual([]);
  });
});

describe('isEarsExperimentalSpec', () => {
  it('is true when an AuthTypeDef is EARS and experimental', () => {
    expect(isEarsExperimentalSpec(stubExperimentalEars)).toBe(true);
  });

  it('is false for stable EARS and non-EARS auth types', () => {
    expect(isEarsExperimentalSpec(stubWithObjectAuth)).toBe(false);
    expect(isEarsExperimentalSpec(stubWithStringAuth)).toBe(false);
  });
});

describe('serializeSpecSummary', () => {
  it('maps metadata, availability, auth ids, and actions from a stub spec', () => {
    const registered: RegisteredSpec = {
      spec: stubWithStringAuth,
      type: listRow('.stub-string-auth'),
    };
    const summary = serializeSpecSummary(registered);

    expect(summary).toEqual({
      id: '.stub-string-auth',
      displayName: 'Stub String Auth',
      description: 'Uses a string auth type',
      icon: 'logo',
      docsUrl: 'https://example.test',
      minimumLicense: 'gold',
      isTechnicalPreview: false,
      supportedFeatureIds: ['workflows'],
      availability: {
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: false,
        isDeprecated: true,
      },
      authTypeIds: ['api_key_header'],
      isTestable: true,
      hasInboundEvents: false,
      isInboundOnly: false,
      isEarsExperimental: false,
      actions: [
        {
          name: 'listThings',
          description: 'List things',
          isTool: true,
          scope: 'read',
        },
      ],
    });
  });

  it('marks an events-only stub as inbound-only with events', () => {
    const summary = serializeSpecSummary({
      spec: stubEventsOnly,
      type: listRow('.stub-events-only'),
    });
    expect(summary.hasInboundEvents).toBe(true);
    expect(summary.isInboundOnly).toBe(true);
  });

  it('marks a dual stub as having events but not inbound-only', () => {
    const summary = serializeSpecSummary({
      spec: stubDual,
      type: listRow('.stub-dual'),
    });
    expect(summary.hasInboundEvents).toBe(true);
    expect(summary.isInboundOnly).toBe(false);
    expect(summary.actions[0]).toEqual({
      name: 'send',
      isTool: false,
      scope: 'destroy',
    });
  });

  it('defaults isTechnicalPreview to false when the spec omits it', () => {
    const summary = serializeSpecSummary({
      spec: stubNoPreview,
      type: listRow('.stub-no-preview'),
    });
    expect(summary.isTechnicalPreview).toBe(false);
  });
});
