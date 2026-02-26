/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import type { ActionTypeModel } from '@kbn/alerts-ui-shared';
import { type ConnectorSpec } from '@kbn/connector-specs';
import type { TriggersAndActionsUIPublicPluginSetup } from '@kbn/triggers-actions-ui-plugin/public';
import type { IUiSettingsClient } from '@kbn/core/public';
import { WorkflowsConnectorFeatureId } from '@kbn/actions-plugin/common';
import { getIcon } from './get_icon';
import {
  createConnectorFormSerializer,
  createConnectorFormDeserializer,
} from './connector_form_serializers';

export function registerConnectorTypesFromSpecs({
  connectorTypeRegistry,
  uiSettingsPromise,
}: {
  connectorTypeRegistry: TriggersAndActionsUIPublicPluginSetup['actionTypeRegistry'];
  uiSettingsPromise: Promise<IUiSettingsClient>;
}) {
  // TODO: Clean this up when workflows:ui:enabled setting is removed.
  // This is a workaround to avoid making the whole thing async.
  // UI Settings will be used by components much later (via getHideInUi), it should be already defined by the time we need it.
  const ref: { uiSettings?: IUiSettingsClient } = {};
  uiSettingsPromise.then((uiSettings) => {
    ref.uiSettings = uiSettings;
  });

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
        createConnectorTypeFromSpec(spec, ref, generateFormFields, generateSchema)
      );
    }
  });
}

const createConnectorTypeFromSpec = (
  spec: ConnectorSpec,
  ref: { uiSettings?: IUiSettingsClient },
  generateFormFields: typeof import('@kbn/response-ops-form-generator').generateFormFields,
  generateSchema: typeof import('./generate_schema').generateSchema
): ActionTypeModel => {
  const schema = generateSchema(spec);

  return {
    id: spec.metadata.id,
    actionTypeTitle: spec.metadata.displayName,
    source: ACTION_TYPE_SOURCES.spec,
    selectMessage: spec.metadata.description,
    iconClass: getIcon(spec),
    // Temporary workaround to hide workflows connector when workflows UI setting is disabled.
    getHideInUi: () => {
      if (
        spec.metadata.supportedFeatureIds.length === 1 &&
        spec.metadata.supportedFeatureIds[0] === WorkflowsConnectorFeatureId
      ) {
        // @ts-expect-error upgrade typescript v5.9.3
        return !ref.uiSettings?.get<boolean>('workflows:ui:enabled', false) ?? false;
      }
      return false;
    },
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
      serializer: createConnectorFormSerializer(),
      deserializer: createConnectorFormDeserializer(schema),
    },
  };
};
