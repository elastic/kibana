/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { ConnectorSpecActionSummary } from '../../../../common/connector_spec';
import type { connectorTypeSchema } from '../schemas';

type ConnectorTypeSchemaType = TypeOf<typeof connectorTypeSchema>;

export interface ConnectorTypeSpecFields {
  icon?: string;
  docsUrl?: string;
  authTypeIds: string[];
  hasInboundEvents: boolean;
  isInboundOnly: boolean;
  isEarsExperimental: boolean;
  actions: ConnectorSpecActionSummary[];
}

export interface ConnectorType {
  id: ConnectorTypeSchemaType['id'];
  name: ConnectorTypeSchemaType['name'];
  enabled: ConnectorTypeSchemaType['enabled'];
  enabledInConfig: ConnectorTypeSchemaType['enabledInConfig'];
  enabledInLicense: ConnectorTypeSchemaType['enabledInLicense'];
  minimumLicenseRequired: ConnectorTypeSchemaType['minimumLicenseRequired'];
  supportedFeatureIds: ConnectorTypeSchemaType['supportedFeatureIds'];
  isSystemActionType: ConnectorTypeSchemaType['isSystemActionType'];
  source: ConnectorTypeSchemaType['source'];
  subFeature?: ConnectorTypeSchemaType['subFeature'];
  isDeprecated: ConnectorTypeSchemaType['isDeprecated'];
  allowMultipleSystemActions?: ConnectorTypeSchemaType['allowMultipleSystemActions'];
  description?: ConnectorTypeSchemaType['description'];
  isExperimental?: ConnectorTypeSchemaType['isExperimental'];
  isTestable: ConnectorTypeSchemaType['isTestable'];
  spec?: ConnectorTypeSpecFields;
}
