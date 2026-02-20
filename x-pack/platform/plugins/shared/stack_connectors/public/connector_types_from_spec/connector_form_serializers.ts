/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorFormSchema } from '@kbn/alerts-ui-shared';
import type { z } from '@kbn/zod/v4';

/**
 * Copy secrets.authType to config.authType when saving the connector.
 * This ensures authType persists since secrets are stripped by the API.
 */
export const createConnectorFormSerializer = () => {
  return (formData: any) => {
    if (!formData?.secrets?.authType) {
      return formData;
    }

    return {
      ...formData,
      config: { ...formData.config, authType: formData.secrets.authType },
    };
  };
};

/**
 * Copies config.authType to secrets.authType when loading the connector.
 * This allows the discriminated union widget to display the correct option on
 * connector edit.
 */
export const createConnectorFormDeserializer = (schema: z.ZodObject<z.ZodRawShape>) => {
  return (
    apiData: ConnectorFormSchema<
      { authType?: string } & Record<string, unknown>,
      Record<string, unknown>
    >
  ) => {
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
  };
};
