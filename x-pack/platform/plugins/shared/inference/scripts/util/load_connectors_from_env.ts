/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

/**
 * The environment variable that is used by the CI to load the connectors configuration
 */
export const AI_CONNECTORS_VAR_ENV = 'KIBANA_TESTING_AI_CONNECTORS';

const connectorsSchema = schema.recordOf(
  schema.string(),
  schema.object({
    name: schema.string(),
    actionTypeId: schema.string(),
    config: schema.recordOf(schema.string(), schema.any()),
    secrets: schema.maybe(schema.recordOf(schema.string(), schema.any())),
  })
);

interface AvailableConnector {
  name: string;
  actionTypeId: string;
  config: Record<string, unknown>;
  secrets?: Record<string, unknown>;
}
export const getStringifiedConnectorsFromConfig = (): string | undefined => {
  const envValue = process.env[AI_CONNECTORS_VAR_ENV];
  if (envValue) {
    let connectors: Record<string, AvailableConnector>;
    try {
      connectors = JSON.parse(Buffer.from(envValue, 'base64').toString('utf-8'));
    } catch (e) {
      throw new Error(
        `Error trying to parse value from ${AI_CONNECTORS_VAR_ENV} environment variable: ${
          (e as Error).message
        }`
      );
    }
    return JSON.stringify(connectorsSchema.validate(connectors));
  }
  return undefined;
};
