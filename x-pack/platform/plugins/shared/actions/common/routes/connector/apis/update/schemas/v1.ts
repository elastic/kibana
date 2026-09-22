/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { validateEmptyStrings } from '../../../../../validate_empty_strings';

export const updateConnectorParamsSchema = schema.object({
  id: schema.string({
    meta: { description: 'An identifier for the connector.' },
  }),
});

const updateConnectorBodyFields = {
  name: schema.string({
    validate: validateEmptyStrings,
    meta: { description: 'The display name for the connector.' },
  }),
  config: schema.recordOf(schema.string(), schema.any({ validate: validateEmptyStrings }), {
    defaultValue: {},
  }),
  secrets: schema.recordOf(schema.string(), schema.any({ validate: validateEmptyStrings }), {
    defaultValue: {},
  }),
};

const isInboundEventsEnabledUpdateField = {
  is_inbound_events_enabled: schema.maybe(
    schema.boolean({
      meta: {
        description:
          'Turn receiving inbound events on or off. Omit to keep the current setting. Only valid for connectors that both send and receive.',
      },
    })
  ),
};

/** Update-connector body schema; omit `is_inbound_events_enabled` unless inbound events are enabled. */
export const getUpdateConnectorBodySchema = (includeInboundEventsField: boolean) =>
  schema.object(
    {
      ...updateConnectorBodyFields,
      ...(includeInboundEventsField ? isInboundEventsEnabledUpdateField : {}),
    },
    { meta: { id: 'update_connector' } }
  );

/** Flag-on schema so TypeOf includes the optional field. */
export const updateConnectorBodySchema = getUpdateConnectorBodySchema(true);
