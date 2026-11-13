/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginSetupContract } from '../../plugin';
import {
  materializeDeclarativeConnectorSpec,
  parseDeclarativeConnectorSpec,
} from '../declarative_connectors';
import { createConnectorTypeFromSpec } from '../single_file_connectors/create_connector_from_spec';
import type { CatalogActionType, StoredCatalogDefinition } from './types';

export type BuildTypeFromStoredSpec = (
  definition: StoredCatalogDefinition,
  actions: PluginSetupContract
) => CatalogActionType;

export const buildTypeFromStoredSpec: BuildTypeFromStoredSpec = (definition, actions) => {
  const spec = materializeDeclarativeConnectorSpec(parseDeclarativeConnectorSpec(definition.yaml));

  // Every catalog connector is enterprise, whatever the YAML says.
  return createConnectorTypeFromSpec(
    { ...spec, metadata: { ...spec.metadata, minimumLicense: 'enterprise' } },
    actions
  );
};
