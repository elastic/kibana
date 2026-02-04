/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionConnectorFieldsProps } from '@kbn/triggers-actions-ui-plugin/public';
import type { SerializerFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type {
  ConnectorFormSchema,
  InternalConnectorForm,
} from '@kbn/alerts-ui-shared/src/common/types';
import type { ComponentType } from 'react';

/**
 * UI override configuration for a data source that needs custom branding.
 * Provides the form component and serialization logic to translate between
 * the branded UI format and the backend connector format.
 */
export interface DataSourceUIOverride {
  /**
   * Import function for the form component.
   * This will be wrapped in React.lazy() during registration to avoid double-wrapping.
   */
  formComponentImport: () => Promise<{ default: ComponentType<ActionConnectorFieldsProps> }>;
  /**
   * Function to serialize UI form data to backend connector format.
   * Uses default generic types to match ActionTypeModel.connectorForm expectations.
   */
  serializer: SerializerFunc<ConnectorFormSchema, InternalConnectorForm>;
  /**
   * Function to deserialize backend connector data to UI form format.
   * Uses default generic types to match ActionTypeModel.connectorForm expectations.
   */
  deserializer: SerializerFunc<InternalConnectorForm, ConnectorFormSchema>;
  /** Display name for the connector (e.g., "GitHub") */
  displayName: string;
  /** Message shown when selecting this connector type */
  selectMessage: string;
  /** Icon class for the connector (e.g., "logoGithub") */
  iconClass: string;
}

/**
 * Complete UI configuration for a data source.
 * Links a data source ID to its optional UI override.
 */
export interface DataSourceUIConfig {
  /** Data source identifier (matches server-side DataSource.id) */
  dataSourceId: string;
  /** Optional UI override for custom branding */
  uiOverride?: DataSourceUIOverride;
}
