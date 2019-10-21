/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState } from 'react';

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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ErrableFormRow } from '../../../components/page_error';
import { ActionTypeModel, Props, Action } from '../../../../types';

const HTTP_VERBS = ['post', 'put'];

export function getActionType(): ActionTypeModel {
  return {
    id: '.webhook',
    iconClass: 'logoWebhook',
    selectMessage: i18n.translate('xpack.watcher.models.webhookAction.selectMessageText', {
      defaultMessage: 'Send a request to a web service.',
    }),
    simulatePrompt: i18n.translate('xpack.watcher.models.webhookAction.simulateButtonLabel', {
      defaultMessage: 'Send request',
    }),
    validate: (action: Action): any => {
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
          i18n.translate('xpack.alertingUI.sections.addAction.error.requiredUrlText', {
            defaultMessage: 'Url is required.',
          })
        );
      }
      if (!action.config.method) {
        errors.method.push(
          i18n.translate('xpack.alertingUI.sections.addAction.error.requiredMethodText', {
            defaultMessage: 'Method is required.',
          })
        );
      }
      if (!action.secrets.user) {
        errors.user.push(
          i18n.translate('xpack.alertingUI.sections.addAction.error.requiredHostText', {
            defaultMessage: 'User is required.',
          })
        );
      }
      if (!action.secrets.password) {
        errors.password.push(
          i18n.translate('xpack.alertingUI.sections.addAction.error.requiredHostText', {
            defaultMessage: 'Password is required.',
          })
        );
      }
      return validationResult;
    },
    actionFields: WebhookActionFields,
  };
}

const WebhookActionFields: React.FunctionComponent<Props> = ({
  action,
  editActionConfig,
  editActionSecrets,
  errors,
  hasErrors,
}) => {
  const [headerKey, setHeaderKey] = useState<string>('');
  const [headerValue, setHeaderValue] = useState<string>('');

  const { user, password }: any = action.secrets;
  const { method, url, headers }: any = action.config;

  editActionConfig('method', 'post'); // set method to POST by default

  const headerErrors = {
    keyHeader: new Array<string>(),
    valueHeader: new Array<string>(),
  };
  if (!headerKey && headerValue) {
    headerErrors.keyHeader.push(
      i18n.translate('xpack.alertingUI.sections.addAction.error.requiredHeaderKeyText', {
        defaultMessage: 'Header Key is required.',
      })
    );
  }
  if (headerKey && !headerValue) {
    headerErrors.valueHeader.push(
      i18n.translate('xpack.alertingUI.sections.addAction.error.requiredHeaderValueText', {
        defaultMessage: 'Header Value is required.',
      })
    );
  }
  const hasHeaderErrors = headerErrors.keyHeader.length > 0 || headerErrors.valueHeader.length > 0;

  function addHeader() {
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

  function removeHeader(objKey: string) {
    const updatedHeaders = Object.keys(headers)
      .filter(key => key !== objKey)
      .reduce((obj: any, key: string) => {
        obj[key] = headers[key];
        return obj;
      }, {});
    editActionConfig('headers', updatedHeaders);
  }

  return (
    <Fragment>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={i18n.translate('xpack.alertingUI.sections.webhookAction.methodFieldLabel', {
              defaultMessage: 'Method',
            })}
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
          <ErrableFormRow
            id="url"
            fullWidth
            errorKey="url"
            errors={errors}
            isShowingErrors={hasErrors === true && url !== undefined}
            label={i18n.translate('xpack.alertingUI.sections.slackPassword.methodUrlLabel', {
              defaultMessage: 'Url',
            })}
          >
            <EuiFieldText
              name="url"
              fullWidth
              value={url || ''}
              data-test-subj="slackUrlText"
              onChange={e => {
                editActionConfig('url', e.target.value);
              }}
              onBlur={() => {
                if (!url) {
                  editActionConfig('url', '');
                }
              }}
            />
          </ErrableFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <ErrableFormRow
            id="webhookUser"
            errorKey="user"
            fullWidth
            errors={errors}
            isShowingErrors={hasErrors === true && user !== undefined}
            label={i18n.translate('xpack.alertingUI.sections.webhookUser.userFieldLabel', {
              defaultMessage: 'User',
            })}
          >
            <EuiFieldText
              fullWidth
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
          </ErrableFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <ErrableFormRow
            id="webhookPassword"
            errorKey="password"
            fullWidth
            errors={errors}
            isShowingErrors={hasErrors === true && password !== undefined}
            label={i18n.translate('xpack.alertingUI.sections.webhookPassword.methodPasswordLabel', {
              defaultMessage: 'Password',
            })}
          >
            <EuiFieldPassword
              fullWidth
              name="password"
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
          </ErrableFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <ErrableFormRow
            id="webhookHeaderKey"
            errorKey="keyHeader"
            fullWidth
            errors={headerErrors}
            isShowingErrors={hasHeaderErrors && headerKey !== undefined}
            label={i18n.translate('xpack.alertingUI.sections.webhookHeaders.keyFieldLabel', {
              defaultMessage: 'Header Key',
            })}
          >
            <EuiFieldText
              fullWidth
              name="keyHeader"
              value={headerKey}
              data-test-subj="webhookHeadersKeyInput"
              onChange={e => {
                setHeaderKey(e.target.value);
              }}
            />
          </ErrableFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ErrableFormRow
            id="webhookHeaderValue"
            errorKey="valueHeader"
            fullWidth
            errors={headerErrors}
            isShowingErrors={hasHeaderErrors && headerValue !== undefined}
            label={i18n.translate('xpack.alertingUI.sections.webhookHeaders.valueFieldLabel', {
              defaultMessage: 'Header Value',
            })}
          >
            <EuiFieldText
              fullWidth
              name="valueHeader"
              value={headerValue}
              data-test-subj="webhookHeadersValueInput"
              onChange={e => {
                setHeaderValue(e.target.value);
              }}
            />
          </ErrableFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiButton
        isDisabled={hasHeaderErrors || !headerKey || !headerValue}
        fill
        onClick={() => addHeader()}
      >
        {i18n.translate('xpack.alertingUI.sections.webhookHeaders.AddHeaderButton', {
          defaultMessage: 'Add header',
        })}
      </EuiButton>
      <EuiSpacer size="m" />
      <Fragment>
        {Object.keys(headers || {}).map((key: string) => {
          return (
            <EuiFlexGroup key={key}>
              <EuiFlexItem grow={false}>
                <EuiText size="m">{key}:</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="m">{headers[key]}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon iconType="cross" onClick={() => removeHeader(key)} />
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        })}
      </Fragment>
    </Fragment>
  );
};
