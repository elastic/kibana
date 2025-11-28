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
import type { z } from '@kbn/zod/v4';
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
      /* webpackChunkName: "singleFileConnectorBundle" */
      '@kbn/connector-specs'
    ),
    import(
      /* webpackChunkName: "singleFileConnectorBundle" */
      '@kbn/response-ops-form-generator'
    ),
    import(
      /* webpackChunkName: "singleFileConnectorBundle" */
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
    connectorForm: {
      /**
       * Copy secrets.authType to config.authType when saving the connector.
       * This ensures authType persists since secrets are stripped by the API.
       */
      serializer: (formData) => {
        if (!formData?.secrets?.authType) return formData;
        return {
          ...formData,
          config: { ...formData.config, authType: formData.secrets.authType },
        };
      },
      /**
       * Copies config.authType to secrets.authType when loading the connector.
       * This allows the discriminated union widget to display the correct option on
       * connector edit.
       */
      deserializer: (apiData) => {
        if (!apiData?.config?.authType || apiData.secrets?.authType) {
          return apiData;
        }

        try {
          const secretsSchema = schema.shape.secrets as unknown as z.ZodDiscriminatedUnion<
            z.ZodObject<z.ZodRawShape>[]
          >;

          if (!secretsSchema.options) {
            return apiData;
          }

          return { ...apiData, secrets: { authType: apiData.config.authType } };
        } catch (error) {
          return apiData;
        }
      },
    },
  };
};
