/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { connectorSchema, connectorWithExtraFindDataSchema } from '../schemas';

type ConnectorSchemaType = TypeOf<typeof connectorSchema>;
type ConnectorWithExtraFindDataSchema = TypeOf<typeof connectorWithExtraFindDataSchema>;

export interface Connector {
  id: ConnectorSchemaType['id'];
  actionTypeId: ConnectorSchemaType['actionTypeId'];
  name: ConnectorSchemaType['name'];
  isMissingSecrets?: ConnectorSchemaType['isMissingSecrets'];
  config?: ConnectorSchemaType['config'];
  isPreconfigured: ConnectorSchemaType['isPreconfigured'];
  isDeprecated: ConnectorSchemaType['isDeprecated'];
  isSystemAction: ConnectorSchemaType['isSystemAction'];
  isConnectorTypeDeprecated: ConnectorSchemaType['isConnectorTypeDeprecated'];
  authMode?: ConnectorSchemaType['authMode'];
  /**
   * One-time secrets returned on create (or when credentials are minted on update).
   * Never persisted. GET/list omit this field.
   */
  secrets?: {
    ingestToken?: string;
  };
}

export interface ConnectorWithExtraFindData extends Connector {
  referencedByCount: ConnectorWithExtraFindDataSchema['referencedByCount'];
}
