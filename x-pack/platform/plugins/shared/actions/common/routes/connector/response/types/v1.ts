/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type {
  connectorResponseSchemaV1,
  connectorTypeResponseSchemaV1,
  allConnectorsResponseSchema,
  connectorExecuteResponseSchema,
} from '..';

type ConnectorResponseSchemaType = TypeOf<typeof connectorResponseSchemaV1>;
type AllConnectorsResponseSchemaType = TypeOf<typeof allConnectorsResponseSchema>;

export interface ConnectorResponse {
  id: ConnectorResponseSchemaType['id'];
  name: ConnectorResponseSchemaType['name'];
  config?: ConnectorResponseSchemaType['config'];
  connector_type_id: ConnectorResponseSchemaType['connector_type_id'];
  is_missing_secrets?: ConnectorResponseSchemaType['is_missing_secrets'];
  is_preconfigured: ConnectorResponseSchemaType['is_preconfigured'];
  is_deprecated: ConnectorResponseSchemaType['is_deprecated'];
  is_system_action: ConnectorResponseSchemaType['is_system_action'];
}

export interface AllConnectorsResponse extends ConnectorResponse {
  referenced_by_count: AllConnectorsResponseSchemaType['referenced_by_count'];
}

type ConnectorTypeResponseSchemaType = TypeOf<typeof connectorTypeResponseSchemaV1>;
export interface ConnectorTypesResponse {
  id: ConnectorTypeResponseSchemaType['id'];
  name: ConnectorTypeResponseSchemaType['name'];
  enabled: ConnectorTypeResponseSchemaType['enabled'];
  enabled_in_config: ConnectorTypeResponseSchemaType['enabled_in_config'];
  enabled_in_license: ConnectorTypeResponseSchemaType['enabled_in_license'];
  minimum_license_required: ConnectorTypeResponseSchemaType['minimum_license_required'];
  supported_feature_ids: ConnectorTypeResponseSchemaType['supported_feature_ids'];
  is_system_action_type: ConnectorTypeResponseSchemaType['is_system_action_type'];
  sub_feature?: ConnectorTypeResponseSchemaType['sub_feature'];
}

type ConnectorExecuteResponseSchemaType = TypeOf<typeof connectorExecuteResponseSchema>;
export interface ConnectorExecuteResponse {
  connector_id: ConnectorExecuteResponseSchemaType['connector_id'];
  status: ConnectorExecuteResponseSchemaType['status'];
  message?: ConnectorExecuteResponseSchemaType['message'];
  service_message?: ConnectorExecuteResponseSchemaType['service_message'];
  data?: ConnectorExecuteResponseSchemaType['data'];
  retry?: ConnectorExecuteResponseSchemaType['retry'];
  errorSource?: ConnectorExecuteResponseSchemaType['errorSource'];
}
