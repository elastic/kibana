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
import { z } from '@kbn/zod/v4';
import React from 'react';
import { FormGenerator } from '@kbn/response-ops-form-generator';
import { getIcon } from './get_icon';

export function registerConnectorTypesFromSpecs({
  connectorTypeRegistry,
}: {
  connectorTypeRegistry: TriggersAndActionsUIPublicPluginSetup['actionTypeRegistry'];
}) {
  const connectorsSpecsImport = import(
    /* webpackChunkName: "connectorsSpecs" */
    '@kbn/connector-specs'
  );
  connectorsSpecsImport.then(({ connectorsSpecs }) => {
    for (const spec of Object.values(connectorsSpecs)) {
      connectorTypeRegistry.register(createConnectorTypeFromSpec(spec));
    }
  });
}

const schema = z.object({
  authType: z.discriminatedUnion('authTypes', [
    z.object({
      authTypes: z.literal('api_key_header'),
      'X-OTX-API-KEY': z.string().min(1, { message: 'API Key cannot be empty' }).meta({
        label: 'API Key',
        sensitive: true,
      }),
    }),
  ]),
});

const createConnectorTypeFromSpec = (spec: ConnectorSpec): ActionTypeModel => ({
  // get generated schema from spec
  // const schema = generateSchema(spec);
  // pass this to the form builder. output should go into actionConnectorFields
  id: spec.metadata.id,
  actionTypeTitle: spec.metadata.displayName,
  selectMessage: spec.metadata.description,
  iconClass: getIcon(spec),
  // TODO: Implement the rest of the properties
  actionConnectorFields: () => <FormGenerator schema={schema} />,
  actionParamsFields: lazy(() => Promise.resolve({ default: () => null })),
  validateParams: async () => ({ errors: {} }),
});
