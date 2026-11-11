/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';
import { z as z4 } from '@kbn/zod/v4';
import type { ActionType } from '../../types';
import type { ActionTypeConfig, ActionTypeParams, ActionTypeSecrets } from '../../types';
import type { PluginSetupContract } from '../../plugin';
import { parseDeclarativeConnectorSpec } from '../declarative_connectors';
import { createConnectorTypeFromSpec } from '../single_file_connectors/create_connector_from_spec';
import type { StoredCatalogDefinition } from './types';

export type BuildTypeFromStoredSpec = (
  definition: StoredCatalogDefinition,
  actions: PluginSetupContract
) => ActionType<ActionTypeConfig, ActionTypeSecrets, ActionTypeParams, unknown>;

// Placeholder body. Swap it for the real build when #289816 (PR #304126) merges.
export const buildTypeFromStoredSpec: BuildTypeFromStoredSpec = (definition, actions) => {
  const { id, metadata } = parseDeclarativeConnectorSpec(definition.yaml);

  const spec: ConnectorSpec = {
    metadata: {
      id,
      displayName: metadata.displayName,
      description: metadata.description,
      isTechnicalPreview: metadata.isTechnicalPreview,
      supportedFeatureIds: metadata.supportedFeatureIds,
      minimumLicense: 'enterprise',
    },
    auth: { types: ['none'] },
    schema: z4.object({}),
    actions: {
      placeholder: {
        scope: 'read',
        input: z4.object({}),
        handler: async () => ({}),
      },
    },
    test: { enabled: false, handler: async () => ({}) },
  };

  return createConnectorTypeFromSpec(spec, actions);
};
