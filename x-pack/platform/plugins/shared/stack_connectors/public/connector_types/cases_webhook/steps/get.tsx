/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import {
  FIELD_TYPES,
  UseField,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { JsonFieldWrapper, MustacheTextFieldWrapper } from '@kbn/triggers-actions-ui-plugin/public';
import { WebhookMethods } from '../../../../common/auth/constants';
import {
  containsExternalIdForGet,
  containsExternalIdOrTitle,
  requiredJsonForPost,
} from '../validator';
import { urlVars, urlVarsExt } from '../action_variables';
import * as i18n from '../translations';

const { emptyField, urlField } = fieldValidators;

interface Props {
  display: boolean;
  readOnly: boolean;
}

export const GetStep: FunctionComponent<Props> = ({ display, readOnly }) => {
  const [{ config }] = useFormData({
    watch: ['config.getIncidentMethod'],
  });
  const { getIncidentMethod = WebhookMethods.GET } = config ?? {};

  return (
    <span data-test-subj="getStep" style={{ display: display ? 'block' : 'none' }}>
      <EuiText>
        <h3>{i18n.STEP_3}</h3>
        <small>
          <p>{i18n.STEP_3_DESCRIPTION}</p>
        </small>
      </EuiText>
      <EuiFlexGroup direction="column">
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <UseField
              path="config.getIncidentMethod"
              component={Field}
              config={{
                label: i18n.GET_INCIDENT_METHOD,
                defaultValue: WebhookMethods.GET,
                type: FIELD_TYPES.SELECT,
                validations: [
                  {
                    validator: emptyField(i18n.GET_METHOD_REQUIRED),
                  },
                ],
              }}
              css={css`
                .euiFormRow__labelWrapper {
                  margin-bottom: 9px;
                }
              `}
              componentProps={{
                euiFieldProps: {
                  'data-test-subj': 'webhookGetIncidentMethodSelect',
                  options: [WebhookMethods.GET, WebhookMethods.POST].map((verb) => ({
                    text: verb.toUpperCase(),
                    value: verb,
                  })),
                  readOnly,
                },
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <UseField
              path="config.getIncidentUrl"
              config={{
                label: i18n.GET_INCIDENT_URL,
                validations: [
                  {
                    validator: urlField(i18n.GET_INCIDENT_URL_REQUIRED),
                  },
                  { validator: containsExternalIdForGet(getIncidentMethod) },
                ],
                helpText: i18n.GET_INCIDENT_URL_HELP,
              }}
              component={MustacheTextFieldWrapper}
              componentProps={{
                euiFieldProps: {
                  readOnly,
                  'data-test-subj': 'webhookGetUrlText',
                  messageVariables: urlVars,
                  paramsProperty: 'getIncidentUrl',
                  buttonTitle: i18n.ADD_CASES_VARIABLE,
                  showButtonTitle: true,
                },
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        {getIncidentMethod === WebhookMethods.POST ? (
          <EuiFlexItem>
            <UseField
              path="config.getIncidentJson"
              config={{
                helpText: i18n.GET_INCIDENT_JSON_HELP,
                label: i18n.GET_INCIDENT_JSON,
                validations: [
                  {
                    validator: requiredJsonForPost(getIncidentMethod),
                  },
                ],
              }}
              component={JsonFieldWrapper}
              componentProps={{
                euiCodeEditorProps: {
                  height: '200px',
                  isReadOnly: readOnly,
                  ['aria-label']: i18n.CODE_EDITOR,
                },
                dataTestSubj: 'webhookGetIncidentJson',
                messageVariables: urlVars,
                paramsProperty: 'getIncidentJson',
                buttonTitle: i18n.ADD_CASES_VARIABLE,
                showButtonTitle: true,
              }}
            />
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem>
          <UseField
            path="config.getIncidentResponseExternalTitleKey"
            config={{
              label: i18n.GET_INCIDENT_TITLE_KEY,
              validations: [
                {
                  validator: emptyField(i18n.GET_RESPONSE_EXTERNAL_TITLE_KEY_REQUIRED),
                },
              ],
              helpText: i18n.GET_INCIDENT_TITLE_KEY_HELP,
            }}
            component={Field}
            componentProps={{
              euiFieldProps: {
                readOnly,
                'data-test-subj': 'getIncidentResponseExternalTitleKeyText',
              },
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <UseField
            path="config.viewIncidentUrl"
            config={{
              label: i18n.EXTERNAL_INCIDENT_VIEW_URL,
              validations: [
                {
                  validator: urlField(i18n.GET_INCIDENT_VIEW_URL_REQUIRED),
                },
                { validator: containsExternalIdOrTitle() },
              ],
              helpText: i18n.EXTERNAL_INCIDENT_VIEW_URL_HELP,
            }}
            component={MustacheTextFieldWrapper}
            componentProps={{
              euiFieldProps: {
                readOnly,
                'data-test-subj': 'viewIncidentUrlText',
                messageVariables: urlVarsExt,
                paramsProperty: 'viewIncidentUrl',
                buttonTitle: i18n.ADD_CASES_VARIABLE,
                showButtonTitle: true,
              },
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </span>
  );
};
