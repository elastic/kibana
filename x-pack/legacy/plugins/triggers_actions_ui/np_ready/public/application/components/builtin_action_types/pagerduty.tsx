/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiFieldText, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ErrableFormRow } from '../page_error';
import {
  ActionTypeModel,
  ActionConnectorFieldsProps,
  ActionConnector,
  ValidationResult,
  ActionParamsProps,
} from '../../../types';

export function getActionType(): ActionTypeModel {
  return {
    id: '.pagerduty',
    iconClass: 'apps',
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.selectMessageText',
      {
        defaultMessage: 'Configure PageDuty API details to send events to their system',
      }
    ),
    validateConnector: (action: ActionConnector): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        routingKey: new Array<string>(),
      };
      validationResult.errors = errors;
      if (!action.secrets.routingKey) {
        errors.routingKey.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.error.requiredRoutingKeyText',
            {
              defaultMessage: 'Routing Key is required.',
            }
          )
        );
      }
      return validationResult;
    },
    validateParams: (actionParams: any): ValidationResult => {
      const validationResult = { errors: {} };
      return validationResult;
    },
    actionConnectorFields: PagerDutyActionConnectorFields,
    actionParamsFields: PagerDutyParamsFields,
  };
}

const PagerDutyActionConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
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
      <EuiFormRow
        id="apiUrl"
        fullWidth
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.apiUrlTextFieldLabel',
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
      </EuiFormRow>
      <ErrableFormRow
        id="routingKey"
        errorKey="routingKey"
        fullWidth
        errors={errors}
        isShowingErrors={hasErrors === true && routingKey !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.routingKeyTextFieldLabel',
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
}) => {
  const { eventAction, dedupKey, summary, source, severity, timestamp, component, group } = action;
  const severityOptions = [
    { value: 'critical', text: 'Critical' },
    { value: 'info', text: 'Info' },
    { value: 'warning', text: 'Warning' },
    { value: 'error', text: 'Error' },
  ];
  const eventActionOptions = [
    { value: 'trigger', text: 'Trigger' },
    { value: 'resolve', text: 'Resolve' },
    { value: 'acknowledge', text: 'Acknowledge' },
  ];
  return (
    <Fragment>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.severitySelectFieldLabel',
              {
                defaultMessage: 'Severity (optional)',
              }
            )}
          >
            <EuiSelect
              fullWidth
              data-test-subj="severitySelect"
              options={severityOptions}
              value={severity}
              onChange={e => {
                editAction('severity', e.target.value, index);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.eventActionSelectFieldLabel',
              {
                defaultMessage: 'Event action (optional)',
              }
            )}
          >
            <EuiSelect
              fullWidth
              data-test-subj="eventActionSelect"
              options={eventActionOptions}
              value={eventAction}
              onChange={e => {
                editAction('eventAction', e.target.value, index);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.dedupKeyTextFieldLabel',
              {
                defaultMessage: 'DedupKey (optional)',
              }
            )}
          >
            <EuiFieldText
              fullWidth
              name="dedupKey"
              data-test-subj="dedupKeyInput"
              value={dedupKey || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                editAction('dedupKey', e.target.value, index);
              }}
              onBlur={() => {
                if (!index) {
                  editAction('dedupKey', '', index);
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.timestampTextFieldLabel',
              {
                defaultMessage: 'Timestamp (optional)',
              }
            )}
          >
            <EuiFieldText
              fullWidth
              name="timestamp"
              data-test-subj="timestampInput"
              value={timestamp || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                editAction('timestamp', e.target.value, index);
              }}
              onBlur={() => {
                if (!index) {
                  editAction('timestamp', '', index);
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.componentTextFieldLabel',
          {
            defaultMessage: 'Component (optional)',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          name="component"
          data-test-subj="componentInput"
          value={component || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            editAction('component', e.target.value, index);
          }}
          onBlur={() => {
            if (!index) {
              editAction('component', '', index);
            }
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.groupTextFieldLabel',
          {
            defaultMessage: 'Group (optional)',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          name="group"
          data-test-subj="groupInput"
          value={group || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            editAction('group', e.target.value, index);
          }}
          onBlur={() => {
            if (!index) {
              editAction('group', '', index);
            }
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.sourceTextFieldLabel',
          {
            defaultMessage: 'Source (optional)',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          name="source"
          data-test-subj="sourceInput"
          value={source || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            editAction('source', e.target.value, index);
          }}
          onBlur={() => {
            if (!index) {
              editAction('source', '', index);
            }
          }}
        />
      </EuiFormRow>
      <ErrableFormRow
        id="pagerDutySummary"
        errorKey="summary"
        fullWidth
        errors={errors}
        isShowingErrors={hasErrors === true && summary !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.summaryFieldLabel',
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
