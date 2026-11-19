/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { MAX_CONNECTOR_TYPE_ID_LENGTH } from '@kbn/connector-specs';
import { validateEmptyStrings } from '../../../../../validate_empty_strings';
import { validateConnectorId } from '../../../../../validate_connector_id';
import {
  CONNECTOR_CONFIG_KEY_MAX_LENGTH,
  CONNECTOR_ID_MAX_LENGTH,
  CONNECTOR_NAME_MAX_LENGTH,
} from '../../../../..';

export const createConnectorRequestParamsSchema = schema.maybe(
  schema.object({
    id: schema.maybe(
      schema.string({
        minLength: 1,
        maxLength: CONNECTOR_ID_MAX_LENGTH,
        validate: validateConnectorId,
        meta: { description: 'An identifier for the connector.' },
      })
    ),
  })
);

const createConnectorRequestBodyFields = {
  name: schema.string({
    maxLength: CONNECTOR_NAME_MAX_LENGTH,
    validate: validateEmptyStrings,
    meta: { description: 'The display name for the connector.' },
  }),
  connector_type_id: schema.string({
    maxLength: MAX_CONNECTOR_TYPE_ID_LENGTH,
    validate: validateEmptyStrings,
    meta: { description: 'The type of connector.' },
  }),
  config: schema.recordOf(
    schema.string({ maxLength: CONNECTOR_CONFIG_KEY_MAX_LENGTH }),
    schema.any({ validate: validateEmptyStrings }),
    {
      defaultValue: {},
    }
  ),
  secrets: schema.recordOf(
    schema.string({ maxLength: CONNECTOR_CONFIG_KEY_MAX_LENGTH }),
    schema.any({ validate: validateEmptyStrings }),
    {
      defaultValue: {},
    }
  ),
};

const isInboundEventsEnabledCreateField = {
  is_inbound_events_enabled: schema.maybe(
    schema.boolean({
      meta: {
        description:
          'When true, this connector can receive inbound events. Only valid for connectors that both send and receive. Defaults to false. Generate the webhook token after create.',
      },
    })
  ),
};

/** Create-connector body schema; omit `is_inbound_events_enabled` unless inbound events are enabled. */
export const getCreateConnectorRequestBodySchema = (includeInboundEventsField: boolean) =>
  schema.object(
    {
      ...createConnectorRequestBodyFields,
      ...(includeInboundEventsField ? isInboundEventsEnabledCreateField : {}),
    },
    { meta: { id: 'new_connector' } }
  );

/** Flag-on schema so TypeOf includes the optional field. */
export const createConnectorRequestBodySchema = getCreateConnectorRequestBodySchema(true);
