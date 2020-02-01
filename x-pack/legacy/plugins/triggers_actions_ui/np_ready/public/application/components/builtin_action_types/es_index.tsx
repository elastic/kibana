/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiFieldText, EuiFormRow, EuiSwitch, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  ActionTypeModel,
  ActionConnectorFieldsProps,
  ValidationResult,
  ActionParamsProps,
} from '../../../types';
import { IndexActionParams, EsIndexActionConnector } from './types';

export function getActionType(): ActionTypeModel {
  return {
    id: '.index',
    iconClass: 'indexOpen',
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.indexAction.selectMessageText',
      {
        defaultMessage: 'Index data into Elasticsearch.',
      }
    ),
    validateConnector: (): ValidationResult => {
      return { errors: {} };
    },
    actionConnectorFields: IndexActionConnectorFields,
    actionParamsFields: IndexParamsFields,
    validateParams: (): ValidationResult => {
      return { errors: {} };
    },
  };
}

const IndexActionConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps<
  EsIndexActionConnector
>> = ({ action, editActionConfig }) => {
  const { index } = action.config;
  return (
    <EuiFormRow
      fullWidth
      label={i18n.translate(
        'xpack.triggersActionsUI.components.builtinActionTypes.indexAction.indexTextFieldLabel',
        {
          defaultMessage: 'Index (optional)',
        }
      )}
    >
      <EuiFieldText
        fullWidth
        name="index"
        data-test-subj="indexInput"
        value={index || ''}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          editActionConfig('index', e.target.value);
        }}
        onBlur={() => {
          if (!index) {
            editActionConfig('index', '');
          }
        }}
      />
    </EuiFormRow>
  );
};

const IndexParamsFields: React.FunctionComponent<ActionParamsProps<IndexActionParams>> = ({
  actionParams,
  index,
  editAction,
}) => {
  const { refresh } = actionParams;
  return (
    <Fragment>
      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.indexAction.indexFieldLabel',
          {
            defaultMessage: 'Index',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          name="index"
          data-test-subj="indexInput"
          value={actionParams.index || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            editAction('index', e.target.value, index);
          }}
          onBlur={() => {
            if (!actionParams.index) {
              editAction('index', '', index);
            }
          }}
        />
      </EuiFormRow>
      <EuiSpacer color="subdued" size="m" />
      <EuiSwitch
        data-test-subj="indexRefreshCheckbox"
        checked={refresh || false}
        onChange={e => {
          editAction('refresh', e.target.checked, index);
        }}
        label={
          <FormattedMessage
            id="xpack.triggersActionsUI.components.builtinActionTypes.indexAction.refreshLabel"
            defaultMessage="Refresh"
          />
        }
      />
    </Fragment>
  );
};
