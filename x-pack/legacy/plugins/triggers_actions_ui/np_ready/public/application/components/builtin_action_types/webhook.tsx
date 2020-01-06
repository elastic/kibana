/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiFieldPassword,
  EuiFieldText,
  EuiFormRow,
  EuiSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiButton,
  EuiButtonIcon,
  EuiText,
  EuiTitle,
  EuiCodeEditor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ActionTypeModel,
  ActionConnectorFieldsProps,
  ActionConnector,
  ValidationResult,
  ActionParamsProps,
} from '../../../types';

const HTTP_VERBS = ['post', 'put'];

export function getActionType(): ActionTypeModel {
  return {
    id: '.webhook',
    iconClass: 'logoWebhook',
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.selectMessageText',
      {
        defaultMessage: 'Send a request to a web service.',
      }
    ),
    validateConnector: (action: ActionConnector): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        url: new Array<string>(),
        method: new Array<string>(),
        user: new Array<string>(),
        password: new Array<string>(),
      };
      validationResult.errors = errors;
      if (!action.config.url) {
        errors.url.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.error.requiredUrlText',
            {
              defaultMessage: 'URL is required.',
            }
          )
        );
      }
      if (!action.config.method) {
        errors.method.push(
          i18n.translate(
            'xpack.triggersActionsUI.sections.addAction.webhookAction.error.requiredMethodText',
            {
              defaultMessage: 'Method is required.',
            }
          )
        );
      }
      if (!action.secrets.user) {
        errors.user.push(
          i18n.translate(
            'xpack.triggersActionsUI.sections.addAction.webhookAction.error.requiredHostText',
            {
              defaultMessage: 'Username is required.',
            }
          )
        );
      }
      if (!action.secrets.password) {
        errors.password.push(
          i18n.translate(
            'xpack.triggersActionsUI.sections.addAction.webhookAction.error.requiredPasswordText',
            {
              defaultMessage: 'Password is required.',
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
    actionConnectorFields: WebhookActionConnectorFields,
    actionParamsFields: WebhookParamsFields,
  };
}

const WebhookActionConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  action,
  editActionConfig,
  editActionSecrets,
  errors,
}) => {
  const [headerKey, setHeaderKey] = useState<string>('');
  const [headerValue, setHeaderValue] = useState<string>('');
  const [hasHeaders, setHasHeaders] = useState<boolean>(false);

  const { user, password } = action.secrets;
  const { method, url, headers } = action.config;

  editActionConfig('method', 'post'); // set method to POST by default

  const headerErrors = {
    keyHeader: new Array<string>(),
    valueHeader: new Array<string>(),
  };
  if (!headerKey && headerValue) {
    headerErrors.keyHeader.push(
      i18n.translate(
        'xpack.triggersActionsUI.sections.addAction.webhookAction.error.requiredHeaderKeyText',
        {
          defaultMessage: 'Header key is required.',
        }
      )
    );
  }
  if (headerKey && !headerValue) {
    headerErrors.valueHeader.push(
      i18n.translate(
        'xpack.triggersActionsUI.sections.addAction.webhookAction.error.requiredHeaderValueText',
        {
          defaultMessage: 'Header value is required.',
        }
      )
    );
  }
  const hasHeaderErrors = headerErrors.keyHeader.length > 0 || headerErrors.valueHeader.length > 0;

  function addHeader() {
    if (!hasHeaders) {
      setHasHeaders(true);
      return;
    }
    if (headers && !!Object.keys(headers).find(key => key === headerKey)) {
      return;
    }
    const updatedHeaders = headers
      ? { ...headers, [headerKey]: headerValue }
      : { [headerKey]: headerValue };
    editActionConfig('headers', updatedHeaders);
    setHeaderKey('');
    setHeaderValue('');
  }

  function removeHeader(keyToRemove: string) {
    const updatedHeaders = Object.keys(headers)
      .filter(key => key !== keyToRemove)
      .reduce((headerToRemove: Record<string, string>, key: string) => {
        headerToRemove[key] = headers[key];
        return headerToRemove;
      }, {});
    editActionConfig('headers', updatedHeaders);
  }

  let headerControl;
  if (hasHeaders) {
    headerControl = (
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiFormRow
            id="webhookHeaderKey"
            fullWidth
            error={headerErrors.keyHeader}
            isInvalid={hasHeaderErrors && headerKey !== undefined}
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.keyTextFieldLabel',
              {
                defaultMessage: 'Header key',
              }
            )}
          >
            <EuiFieldText
              fullWidth
              isInvalid={hasHeaderErrors && headerKey !== undefined}
              name="keyHeader"
              value={headerKey}
              data-test-subj="webhookHeadersKeyInput"
              onChange={e => {
                setHeaderKey(e.target.value);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            id="webhookHeaderValue"
            fullWidth
            error={headerErrors.valueHeader}
            isInvalid={hasHeaderErrors && headerValue !== undefined}
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.valueTextFieldLabel',
              {
                defaultMessage: 'Header value',
              }
            )}
          >
            <EuiFieldText
              fullWidth
              isInvalid={hasHeaderErrors && headerValue !== undefined}
              name="valueHeader"
              value={headerValue}
              data-test-subj="webhookHeadersValueInput"
              onChange={e => {
                setHeaderValue(e.target.value);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <Fragment>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.methodTextFieldLabel',
              {
                defaultMessage: 'Method',
              }
            )}
          >
            <EuiSelect
              name="method"
              value={method || 'post'}
              data-test-subj="webhookMethodSelect"
              options={HTTP_VERBS.map(verb => ({ text: verb.toUpperCase(), value: verb }))}
              onChange={e => {
                editActionConfig('method', e.target.value);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id="url"
            fullWidth
            error={errors.url}
            isInvalid={errors.url.length > 0 && url !== undefined}
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.urlTextFieldLabel',
              {
                defaultMessage: 'URL',
              }
            )}
          >
            <EuiFieldText
              name="url"
              isInvalid={errors.url.length > 0 && url !== undefined}
              fullWidth
              value={url || ''}
              data-test-subj="webhookUrlText"
              onChange={e => {
                editActionConfig('url', e.target.value);
              }}
              onBlur={() => {
                if (!url) {
                  editActionConfig('url', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiFormRow
            id="webhookUser"
            fullWidth
            error={errors.user}
            isInvalid={errors.user.length > 0 && user !== undefined}
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.userTextFieldLabel',
              {
                defaultMessage: 'Username',
              }
            )}
          >
            <EuiFieldText
              fullWidth
              isInvalid={errors.user.length > 0 && user !== undefined}
              name="user"
              value={user || ''}
              data-test-subj="webhookUserInput"
              onChange={e => {
                editActionSecrets('user', e.target.value);
              }}
              onBlur={() => {
                if (!user) {
                  editActionSecrets('user', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id="webhookPassword"
            fullWidth
            error={errors.password}
            isInvalid={errors.password.length > 0 && password !== undefined}
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.passwordTextFieldLabel',
              {
                defaultMessage: 'Password',
              }
            )}
          >
            <EuiFieldPassword
              fullWidth
              name="password"
              isInvalid={errors.password.length > 0 && password !== undefined}
              value={password || ''}
              data-test-subj="webhookPasswordInput"
              onChange={e => {
                editActionSecrets('password', e.target.value);
              }}
              onBlur={() => {
                if (!password) {
                  editActionSecrets('password', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />
      <EuiButton
        isDisabled={hasHeaders && (hasHeaderErrors || !headerKey || !headerValue)}
        fill
        data-test-subj="webhookAddHeaderButton"
        onClick={() => addHeader()}
      >
        <FormattedMessage
          defaultMessage="Add HTTP header"
          id="xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.addHeaderButton"
        />
      </EuiButton>

      <EuiSpacer size="s" />
      {headerControl}
      <EuiSpacer size="m" />
      <Fragment>
        {hasHeaders ? (
          <EuiTitle size="xs">
            <h5>
              <FormattedMessage
                defaultMessage="HTTP header list:"
                id="xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.httpHeadersTitle"
              />
            </h5>
          </EuiTitle>
        ) : null}
        {Object.keys(headers || {}).map((key: string) => {
          return (
            <EuiFlexGroup key={key} data-test-subj="webhookHeaderText">
              <EuiFlexItem grow={false}>
                <EuiText size="m">{key}:</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="m">{headers[key]}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  aria-label={i18n.translate(
                    'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.deleteHeaderButton',
                    {
                      defaultMessage: 'Delete',
                      description: 'Delete HTTP header',
                    }
                  )}
                  iconType="cross"
                  onClick={() => removeHeader(key)}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        })}
      </Fragment>
    </Fragment>
  );
};

const WebhookParamsFields: React.FunctionComponent<ActionParamsProps> = ({
  action,
  editAction,
  index,
  errors,
  hasErrors,
}) => {
  const { body } = action;

  return (
    <Fragment>
      <EuiFormRow
        id="webhookBody"
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.bodyFieldLabel',
          {
            defaultMessage: 'Body',
          }
        )}
        isInvalid={hasErrors === true}
        fullWidth
        error={errors.body}
      >
        <EuiCodeEditor
          fullWidth
          isInvalid={hasErrors === true}
          mode="json"
          width="100%"
          height="200px"
          theme="github"
          data-test-subj="webhookBodyEditor"
          aria-label={i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.bodyCodeEditorAriaLabel',
            {
              defaultMessage: 'Code editor',
            }
          )}
          value={body || ''}
          onChange={(json: string) => {
            editAction('body', json, index);
          }}
        />
      </EuiFormRow>
    </Fragment>
  );
};
