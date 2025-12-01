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
import type { IUiSettingsClient } from '@kbn/core/public';
import { WorkflowsConnectorFeatureId } from '@kbn/actions-plugin/common';
import { getIcon } from './get_icon';

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

  // Creating an async chunk for the connectors specs.
  // This is a workaround to avoid webpack from bundling the entire @kbn/connector-specs package into the main stackConnectors plugin bundle.
  // If this chunk grows too much, we could have problems in some pages since the connectors won't be registered in time for rendering.
  import(
    /* webpackChunkName: "connectorsSpecs" */
    '@kbn/connector-specs'
  ).then(({ connectorsSpecs }) => {
    for (const spec of Object.values(connectorsSpecs)) {
      connectorTypeRegistry.register(createConnectorTypeFromSpec(spec, ref));
    }
  });
}

const createConnectorTypeFromSpec = (
  spec: ConnectorSpec,
  ref: { uiSettings?: IUiSettingsClient }
): ActionTypeModel => ({
  // get generated schema from spec
  // const schema = generateSchema(spec);
  // pass this to the form builder. output should go into actionConnectorFields
  id: spec.metadata.id,
  actionTypeTitle: spec.metadata.displayName,
  selectMessage: spec.metadata.description,
  iconClass: getIcon(spec),
  // Temporary workaround to hide workflows connector when workflows UI setting is disabled.
  getHideInUi: () => {
    if (
      spec.metadata.supportedFeatureIds.length === 1 &&
      spec.metadata.supportedFeatureIds[0] === WorkflowsConnectorFeatureId
    ) {
      // @ts-expect-error upgrade typescript v5.9.3
      return !ref.uiSettings?.get<boolean>('workflows:ui:enabled') ?? false;
    }
    return false;
  },
  // TODO: Implement the rest of the properties
  actionConnectorFields: null,
  actionParamsFields: lazy(() => Promise.resolve({ default: () => null })),
  validateParams: async () => ({ errors: {} }),
});
