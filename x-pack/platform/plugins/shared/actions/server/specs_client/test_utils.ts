/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';
import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import type { ActionType } from '../../common';

interface SpecMetadata {
  id: string;
  displayName?: string;
  description?: string;
  minimumLicense?: string;
  supportedFeatureIds?: string[];
  [key: string]: unknown;
}

export const createSpec = <T extends Record<string, unknown>>(
  overrides: T & { metadata: Pick<SpecMetadata, 'id'> & Partial<SpecMetadata> }
): ConnectorSpec => {
  const metadata = {
    displayName: overrides.metadata.id,
    description: overrides.metadata.id,
    minimumLicense: 'basic',
    supportedFeatureIds: [],
    ...overrides.metadata,
  };

  return {
    auth: null,
    schema: null,
    actions: {},
    test: { handler: async () => ({}), enabled: false },
    ...overrides,
    metadata,
  } as unknown as ConnectorSpec;
};

export const createActionType = (id: string, overrides: Partial<ActionType> = {}): ActionType => ({
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

export const createExperimentalEarsSpec = (): ConnectorSpec =>
  createSpec({
    metadata: {
      id: '.stub-experimental-ears',
      displayName: 'Stub (experimental EARS)',
      description: 'Experimental EARS auth',
    },
    auth: {
      types: [{ type: 'ears', isExperimental: true, defaults: {} }],
    },
    test: { handler: async () => ({}), enabled: true },
  });
