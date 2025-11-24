/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import type { ActionTypeModel } from '@kbn/alerts-ui-shared';
import { type ConnectorSpec } from '@kbn/connector-specs';
import type { TriggersAndActionsUIPublicPluginSetup } from '@kbn/triggers-actions-ui-plugin/public';
import { getIcon } from './get_icon';

export function registerConnectorTypesFromSpecs({
  connectorTypeRegistry,
}: {
  connectorTypeRegistry: TriggersAndActionsUIPublicPluginSetup['actionTypeRegistry'];
}) {
  // Creating an async chunk for the connectors specs.
  // This is a workaround to avoid webpack from bundling the entire @kbn/connector-specs package into the main stackConnectors plugin bundle.
  // If this chunk grows too much, we could have problems in some pages since the connectors won't be registered in time for rendering.
  import(
    /* webpackChunkName: "connectorsSpecs" */
    '@kbn/connector-specs'
  ).then(({ connectorsSpecs }) => {
    for (const spec of Object.values(connectorsSpecs)) {
      connectorTypeRegistry.register(createConnectorTypeFromSpec(spec));
    }
  });
}

const createConnectorTypeFromSpec = (spec: ConnectorSpec): ActionTypeModel => ({
  // get generated schema from spec
  // const schema = generateSchema(spec);
  // pass this to the form builder. output should go into actionConnectorFields
  id: spec.metadata.id,
  actionTypeTitle: spec.metadata.displayName,
  selectMessage: spec.metadata.description,
  iconClass: getIcon(spec),
  // TODO: Implement the rest of the properties
  actionConnectorFields: null,
  actionParamsFields: lazy(() => Promise.resolve({ default: () => null })),
  validateParams: async () => ({ errors: {} }),
});
