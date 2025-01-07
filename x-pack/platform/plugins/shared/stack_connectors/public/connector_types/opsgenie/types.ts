/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RecursivePartial } from '@elastic/eui';
import {
  ActionParamsProps,
  UserConfiguredActionConnector,
} from '@kbn/triggers-actions-ui-plugin/public/types';
import type {
  OpsgenieActionConfig,
  OpsgenieActionSecrets,
  OpsgenieActionParams,
} from '../../../server/connector_types';

export type OpsgenieActionConnector = UserConfiguredActionConnector<
  OpsgenieActionConfig,
  OpsgenieActionSecrets
>;

/**
 * These fields will never be sent to Opsgenie or the sub actions framework. This allows us to pass a value to the
 * validation functions so it cause a validation failure if the json editor has an error. That way the user can't save
 * test.
 */
interface JsonEditorError {
  jsonEditorError: boolean;
}

export type OpsgenieConnectorTypeParams = OpsgenieActionParams & JsonEditorError;

export type ValidationParams = RecursivePartial<OpsgenieActionParams> & JsonEditorError;

type EditActionParameters = Parameters<ActionParamsProps<OpsgenieActionParams>['editAction']>;

export type EditActionCallback = (
  key: EditActionParameters[0],
  value: EditActionParameters[1]
) => ReturnType<ActionParamsProps<OpsgenieActionParams>['editAction']>;
