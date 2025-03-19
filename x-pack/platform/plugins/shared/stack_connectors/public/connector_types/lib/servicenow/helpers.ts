/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import { lazy } from 'react';
import type { EuiSelectOption } from '@elastic/eui';
import type { ActionConnector, IErrorObject } from '@kbn/triggers-actions-ui-plugin/public';
import { deprecatedMessage } from '@kbn/triggers-actions-ui-plugin/public';
import type { AppInfo, Choice, RESTApiError } from './types';
import { CORSError } from './cors_error';

export const DEFAULT_CORRELATION_ID = '{{rule.id}}:{{alert.id}}';

export const ACTION_GROUP_RECOVERED = 'recovered';

export const choicesToEuiOptions = (choices: Choice[]): EuiSelectOption[] =>
  choices.map((choice) => ({ value: choice.value, text: choice.label }));

export const isRESTApiError = (res: AppInfo | RESTApiError | undefined): res is RESTApiError =>
  res != null &&
  ((res as RESTApiError).error != null || (res as RESTApiError).status === 'failure');

export const isCORSError = (error: unknown): error is CORSError => error instanceof CORSError;

export const isFieldInvalid = (
  field: string | undefined | null,
  error: string | IErrorObject | string[]
): boolean => error !== undefined && Number(error.length) > 0 && field !== undefined;

export const getConnectorDescriptiveTitle = (connector: ActionConnector) => {
  let title = connector.name;

  if (connector.isDeprecated) {
    title += ` ${deprecatedMessage}`;
  }

  return title;
};

export const getSelectedConnectorIcon = (
  actionConnector: ActionConnector
): React.LazyExoticComponent<ComponentType<{ actionConnector: ActionConnector }>> | undefined => {
  if (actionConnector.isDeprecated) {
    return lazy(() => import('./selection_row'));
  }
};
