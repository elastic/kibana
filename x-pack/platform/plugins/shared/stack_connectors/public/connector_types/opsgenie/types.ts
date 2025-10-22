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
import type { Config, Secrets, Params } from '@kbn/connector-schemas/opsgenie';

export type OpsgenieActionConnector = UserConfiguredActionConnector<Config, Secrets>;

/**
 * These fields will never be sent to Opsgenie or the sub actions framework. This allows us to pass a value to the
 * validation functions so it cause a validation failure if the json editor has an error. That way the user can't save
 * test.
 */
interface JsonEditorError {
  jsonEditorError: boolean;
}

export type OpsgenieConnectorTypeParams = Params & JsonEditorError;

export type ValidationParams = RecursivePartial<Params> & JsonEditorError;

type EditActionParameters = Parameters<ActionParamsProps<Params>['editAction']>;

export type EditActionCallback = (
  key: EditActionParameters[0],
  value: EditActionParameters[1]
) => ReturnType<ActionParamsProps<Params>['editAction']>;
