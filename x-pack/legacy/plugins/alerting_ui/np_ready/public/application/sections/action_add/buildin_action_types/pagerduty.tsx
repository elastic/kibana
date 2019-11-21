/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ErrableFormRow } from '../../../components/page_error';
import {
  ActionTypeModel,
  Props,
  Action,
  ValidationResult,
  ActionParamsProps,
} from '../../../../types';

export function getActionType(): ActionTypeModel {
  return {
    id: '.pagerduty',
    iconClass: 'apps',
    selectMessage: i18n.translate(
      'xpack.alertingUI.sections.actionAdd.pagerDutyAction.selectMessageText',
      {
        defaultMessage: 'Create an event in PagerDuty.',
      }
    ),
    validate: (action: Action): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        routingKey: new Array<string>(),
        apiUrl: new Array<string>(),
      };
      validationResult.errors = errors;
      if (!action.secrets.routingKey) {
        errors.routingKey.push(
          i18n.translate(
            'xpack.alertingUI.sections.actionAdd.pagerDutyAction.error.requiredRoutingKeyText',
            {
              defaultMessage: 'Routing Key is required.',
            }
          )
        );
      }
      if (!action.config.apiUrl) {
        errors.apiUrl.push(
          i18n.translate(
            'xpack.alertingUI.sections.actionAdd.pagerDutyAction.error.requiredApiUrlText',
            {
              defaultMessage: 'ApiUrl is required.',
            }
          )
        );
      }
      return validationResult;
    },
    validateParams: (action: Action): ValidationResult => {
      const validationResult = { errors: {} };
      return validationResult;
    },
    actionFields: PagerDutyActionFields,
    actionParamsFields: PagerDutyParamsFields,
  };
}

const PagerDutyActionFields: React.FunctionComponent<Props> = ({
  errors,
  hasErrors,
  action,
  editActionConfig,
  editActionSecrets,
}) => {
  const { apiUrl } = action.config;
  const { routingKey } = action.secrets;
  return (
    <Fragment>
      <ErrableFormRow
        id="apiUrl"
        errorKey="apiUrl"
        fullWidth
        errors={errors}
        isShowingErrors={hasErrors === true && apiUrl !== undefined}
        label={i18n.translate(
          'xpack.alertingUI.sections.actionAdd.pagerDutyAction.apiUrlTextFieldLabel',
          {
            defaultMessage: 'ApiUrl',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          name="apiUrl"
          value={apiUrl || ''}
          data-test-subj="pagerdutyApiUrlInput"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            editActionConfig('apiUrl', e.target.value);
          }}
          onBlur={() => {
            if (!apiUrl) {
              editActionConfig('apiUrl', '');
            }
          }}
        />
      </ErrableFormRow>
      <ErrableFormRow
        id="routingKey"
        errorKey="routingKey"
        fullWidth
        errors={errors}
        isShowingErrors={hasErrors === true && routingKey !== undefined}
        label={i18n.translate(
          'xpack.alertingUI.sections.actionAdd.pagerDutyAction.routingKeyTextFieldLabel',
          {
            defaultMessage: 'RoutingKey',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          name="routingKey"
          value={routingKey || ''}
          data-test-subj="pagerdutyRoutingKeyInput"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            editActionSecrets('routingKey', e.target.value);
          }}
          onBlur={() => {
            if (!routingKey) {
              editActionSecrets('routingKey', '');
            }
          }}
        />
      </ErrableFormRow>
    </Fragment>
  );
};

const PagerDutyParamsFields: React.FunctionComponent<ActionParamsProps> = ({
  action,
  editAction,
  index,
  errors,
  hasErrors,
  children,
}) => {
  const { eventAction, dedupKey, summary, source, severity, timestamp, component, group } = action;
  return (
    <Fragment>
      {children}
      <ErrableFormRow
        id="pagerDutySummary"
        errorKey="summary"
        fullWidth
        errors={errors}
        isShowingErrors={hasErrors === true && summary !== undefined}
        label={i18n.translate(
          'xpack.alertingUI.sections.actionAdd.pagerDutyAction.summaryFieldLabel',
          {
            defaultMessage: 'Summary',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          name="summary"
          value={summary || ''}
          data-test-subj="pagerdutyDescriptionInput"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            editAction('summary', e.target.value, index);
          }}
          onBlur={() => {
            if (!summary) {
              editAction('summary', '', index);
            }
          }}
        />
      </ErrableFormRow>
    </Fragment>
  );
};
