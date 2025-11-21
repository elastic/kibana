/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RecursivePartial } from '@elastic/eui';
import type {
  ActionParamsProps,
  UserConfiguredActionConnector,
} from '@kbn/triggers-actions-ui-plugin/public/types';
import type {
  Config as JiraServiceManagementActionConfig,
  Secrets as JiraServiceManagementActionSecrets,
  Params as JiraServiceManagementActionParams,
} from '@kbn/connector-schemas/jira-service-management';

export type JiraServiceManagementActionConnector = UserConfiguredActionConnector<
  JiraServiceManagementActionConfig,
  JiraServiceManagementActionSecrets
>;

/**
 * These fields will never be sent to JSM or the sub actions framework. This allows us to pass a value to the
 * validation functions so it cause a validation failure if the json editor has an error. That way the user can't save
 * test.
 */
interface JsonEditorError {
  jsonEditorError: boolean;
}

export type JiraServiceManagementConnectorTypeParams = JiraServiceManagementActionParams &
  JsonEditorError;

export type ValidationParams = RecursivePartial<JiraServiceManagementActionParams> &
  JsonEditorError;

type EditActionParameters = Parameters<
  ActionParamsProps<JiraServiceManagementActionParams>['editAction']
>;

export type EditActionCallback = (
  key: EditActionParameters[0],
  value: EditActionParameters[1]
) => ReturnType<ActionParamsProps<JiraServiceManagementActionParams>['editAction']>;
