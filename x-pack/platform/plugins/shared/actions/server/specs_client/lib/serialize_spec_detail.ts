/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serializeConnectorSpec } from '@kbn/connector-specs/src/lib/serialize_connector_spec';
import { z } from '@kbn/zod/v4';
import type { ConnectorSpecDetail } from '../../../common/connector_spec';
import type { ActionsConfigurationUtilities } from '../../actions_config';
import type { RegisteredSpec } from './get_registered_spec';
import { serializeSpecActionSummary, serializeSpecSummary } from './serialize_spec_summary';

export const serializeSpecDetail = (
  registered: RegisteredSpec,
  configurationUtilities: ActionsConfigurationUtilities
): ConnectorSpecDetail => {
  try {
    const { spec } = registered;
    const webhookSettings = configurationUtilities.getWebhookSettings();
    const serialized = serializeConnectorSpec(spec, {
      isPfxEnabled: webhookSettings.ssl.pfx.enabled,
      isEarsEnabled: configurationUtilities.isEarsEnabled(),
      isEarsExperimentalEnabled: configurationUtilities.isEarsExperimentalEnabled(),
    });
    const summary = serializeSpecSummary(registered);

    return {
      ...summary,
      formSchema: serialized.schema,
      ...(spec.skill !== undefined ? { skill: spec.skill } : {}),
      actions: Object.entries(spec.actions).map(([name, def]) => ({
        ...serializeSpecActionSummary(name, def),
        inputSchema: z.toJSONSchema(def.input, {
          unrepresentable: 'any',
          io: 'input',
        }) as Record<string, unknown>,
      })),
    };
  } catch (error) {
    throw new Error(
      `Failed to serialize connector spec: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
