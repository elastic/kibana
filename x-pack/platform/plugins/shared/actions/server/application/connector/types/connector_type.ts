/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { connectorTypeSchema } from '../schemas';

type ConnectorTypeSchemaType = TypeOf<typeof connectorTypeSchema>;

export interface ConnectorType {
  id: ConnectorTypeSchemaType['id'];
  name: ConnectorTypeSchemaType['name'];
  enabled: ConnectorTypeSchemaType['enabled'];
  enabledInConfig: ConnectorTypeSchemaType['enabledInConfig'];
  enabledInLicense: ConnectorTypeSchemaType['enabledInLicense'];
  minimumLicenseRequired: ConnectorTypeSchemaType['minimumLicenseRequired'];
  supportedFeatureIds: ConnectorTypeSchemaType['supportedFeatureIds'];
  isSystemActionType: ConnectorTypeSchemaType['isSystemActionType'];
}
