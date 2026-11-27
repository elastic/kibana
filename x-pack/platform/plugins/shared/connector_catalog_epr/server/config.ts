/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  // Own setting. It does not read xpack.fleet.registryUrl.
  registryUrl: schema.string({ defaultValue: 'https://epr.elastic.co', maxLength: 2048 }),
  packageName: schema.string({ defaultValue: 'kibana_connector_specs', maxLength: 256 }),
  // Armored OpenPGP public key used to check the package signature.
  publicKeyPath: schema.maybe(schema.string({ maxLength: 4096 })),
});

export type ConnectorCatalogEprConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<ConnectorCatalogEprConfig> = {
  schema: configSchema,
};
