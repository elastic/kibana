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
  Promise.all([
    // Creating an async chunk for the connectors specs.
    // This is a workaround to avoid webpack from bundling the entire @kbn/connector-specs package into the main stackConnectors plugin bundle.
    // If this chunk grows too much, we could have problems in some pages since the connectors won't be registered in time for rendering.
    import(
      /* webpackChunkName: "connectorsSpecs" */
      '@kbn/connector-specs'
    ),
    import(
      /* webpackChunkName: "formGenerator" */
      '@kbn/response-ops-form-generator'
    ),
    import(
      /* webpackChunkName: "generateSchema" */
      './generate_schema'
    ),
  ]).then(([{ connectorsSpecs }, { generateFormFields }, { generateSchema }]) => {
    for (const spec of Object.values(connectorsSpecs)) {
      connectorTypeRegistry.register(
        createConnectorTypeFromSpec(spec, generateFormFields, generateSchema)
      );
    }
  });
}

const createConnectorTypeFromSpec = (
  spec: ConnectorSpec,
  generateFormFields: typeof import('@kbn/response-ops-form-generator').generateFormFields,
  generateSchema: typeof import('./generate_schema').generateSchema
): ActionTypeModel => {
  const schema = generateSchema(spec);

  return {
    id: spec.metadata.id,
    actionTypeTitle: spec.metadata.displayName,
    selectMessage: spec.metadata.description,
    iconClass: getIcon(spec),
    actionConnectorFields: lazy(() =>
      Promise.resolve({
        default: (props) => {
          return generateFormFields({
            schema,
            formConfig: { disabled: props.readOnly, isEdit: props.isEdit },
          });
        },
      })
    ),
    actionParamsFields: lazy(() => Promise.resolve({ default: () => null })),
    validateParams: async () => ({ errors: {} }),
  };
};
