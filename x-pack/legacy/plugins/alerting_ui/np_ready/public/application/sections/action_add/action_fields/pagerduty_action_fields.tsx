/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ErrableFormRow } from '../../../components/page_error';
import { Action } from '../../../lib/api';

interface Props {
  action: Action;
  editActionConfig: (property: string, value: any) => void;
  editActionSecrets: (property: string, value: any) => void;
  errors: { [key: string]: string[] };
  hasErrors: boolean;
}

export const PagerDutyActionFields: React.FunctionComponent<Props> = ({
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
        isShowingErrors={hasErrors && apiUrl !== undefined}
        label={i18n.translate(
          'xpack.alertingUI.sections.actionAdd.pagerDutyAction.apiUrlFieldLabel',
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
        isShowingErrors={hasErrors && routingKey !== undefined}
        label={i18n.translate(
          'xpack.alertingUI.sections.actionAdd.pagerDutyAction.routingKeyFieldLabel',
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
