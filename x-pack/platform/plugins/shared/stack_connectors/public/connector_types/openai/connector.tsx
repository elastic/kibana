/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  ActionConnectorFieldsProps,
  SimpleConnectorForm,
} from '@kbn/triggers-actions-ui-plugin/public';
import {
  SelectField,
  TextField,
  ToggleField,
} from '@kbn/es-ui-shared-plugin/static/forms/components';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import {
  UseArray,
  UseField,
  useFormContext,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import * as i18nAuth from '../../common/auth/translations';
import DashboardLink from './dashboard_link';
import { OpenAiProviderType } from '../../../common/openai/constants';
import * as i18n from './translations';
import {
  azureAiConfig,
  azureAiSecrets,
  otherOpenAiConfig,
  otherOpenAiSecrets,
  openAiSecrets,
  providerOptions,
  openAiConfig,
  pkiConfig,
} from './constants';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FieldConfig, ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { ConfigFieldSchema } from '@kbn/triggers-actions-ui-plugin/public';

const { emptyField } = fieldValidators;

interface FormData {
  certificateFile?: string | string[];
  certificateData?: string;
  privateKeyFile?: string | string[];
  privateKeyData?: string;
}

const ConnectorFields: React.FC<ActionConnectorFieldsProps> = ({ readOnly, isEdit }) => {
  const { euiTheme } = useEuiTheme();
  const { getFieldDefaultValue } = useFormContext();
  const [{ config, __internal__, id, name }] = useFormData({
    watch: ['config.apiProvider', '__internal__.hasHeaders', '__internal__.hasPKI'],
  });
  const hasHeaders = __internal__ != null ? __internal__.hasHeaders : false;
  const hasHeadersDefaultValue = !!getFieldDefaultValue<boolean | undefined>('config.headers');
  const hasPKI = __internal__ != null ? __internal__.hasPKI : false;
  const hasPKIDefaultValue = !!getFieldDefaultValue<boolean | undefined>('__internal__.hasPKI');

  const selectedProviderDefaultValue = useMemo(
    () =>
      getFieldDefaultValue<OpenAiProviderType>('config.apiProvider') ?? OpenAiProviderType.OpenAi,
    [getFieldDefaultValue]
  );

  const verificationModeOptions = [
    { value: 'full', text: i18n.VERIFICATION_MODE_FULL },
    { value: 'certificate', text: i18n.VERIFICATION_MODE_CERTIFICATE },
    { value: 'none', text: i18n.VERIFICATION_MODE_NONE },
  ];

  return (
    <>
      <UseField
        path="config.apiProvider"
        component={SelectField}
        config={{
          label: i18n.API_PROVIDER_LABEL,
          defaultValue: selectedProviderDefaultValue,
          validations: [
            {
              validator: emptyField(i18n.API_PROVIDER_REQUIRED),
            },
          ],
        }}
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'config.apiProvider-select',
            options: providerOptions,
            fullWidth: true,
            hasNoInitialSelection: false,
            disabled: readOnly,
            readOnly,
          },
        }}
      />
      <EuiSpacer size="s" />
      {config != null && config.apiProvider === OpenAiProviderType.OpenAi && (
        <SimpleConnectorForm
          isEdit={isEdit}
          readOnly={readOnly}
          configFormSchema={openAiConfig}
          secretsFormSchema={openAiSecrets}
        />
      )}
      {config != null && config.apiProvider === OpenAiProviderType.AzureAi && (
        <SimpleConnectorForm
          isEdit={isEdit}
          readOnly={readOnly}
          configFormSchema={azureAiConfig}
          secretsFormSchema={azureAiSecrets}
        />
      )}
      {config != null && config.apiProvider === OpenAiProviderType.Other && (
        <>
          <SimpleConnectorForm
            isEdit={isEdit}
            readOnly={readOnly}
            configFormSchema={[
              ...otherOpenAiConfig,
              ...(hasPKI ? pkiConfig.map(field => {
                const fieldConfig: FieldConfig<string | string[] | undefined, FormData> = {
                  label: field.label,
                  helpText: field.helpText,
                  defaultValue: field.defaultValue,
                  type: field.type,
                  validations: [
                    {
                      validator: ((data) => {
                        const { value, formData } = data;
                        if (
                          (formData.certificateFile || formData.privateKeyFile || formData.certificateData || formData.privateKeyData) &&
                          !(formData.certificateFile || formData.certificateData)
                        ) {
                          return {
                            message: i18n.MISSING_CERTIFICATE,
                          };
                        }
                        if (
                          (formData.certificateFile || formData.privateKeyFile || formData.certificateData || formData.privateKeyData) &&
                          !(formData.privateKeyFile || formData.privateKeyData)
                        ) {
                          return {
                            message: i18n.MISSING_PRIVATE_KEY,
                          };
                        }
                        return undefined;
                      }) as ValidationFunc<FormData, string, string | string[] | undefined>,
                    },
                  ],
                };
                return {
                  ...field,
                  ...fieldConfig,
                } as ConfigFieldSchema;
              }) : [])
            ]}
            secretsFormSchema={otherOpenAiSecrets}
          />
          <EuiSpacer size="s" />
          <UseField
            path="__internal__.hasPKI"
            component={ToggleField}
            config={{
              defaultValue: hasPKIDefaultValue,
              label: i18n.PKI_MODE_LABEL,
            }}
            componentProps={{
              euiFieldProps: {
                disabled: readOnly,
                'data-test-subj': 'openAIViewPKISwitch',
              },
            }}
          />
          {hasPKI && (
            <>
              <EuiSpacer size="s" />
              <SimpleConnectorForm
                isEdit={isEdit}
                readOnly={readOnly}
                configFormSchema={pkiConfig}
                secretsFormSchema={[]}
              />
              <EuiSpacer size="s" />
              <UseField
                path="config.verificationMode"
                component={SelectField}
                config={{
                  label: i18n.VERIFICATION_MODE_LABEL,
                  defaultValue: 'full',
                  helpText: (
                    <FormattedMessage
                      defaultMessage="Controls SSL/TLS certificate verification: 'Full' verifies both certificate and hostname, 'Certificate' verifies the certificate but not the hostname, 'None' skips all verification (use cautiously, e.g., for testing)."
                      id="xpack.stackConnectors.components.genAi.verificationModeDocumentation"
                    />
                  ),
                }}
                componentProps={{
                  euiFieldProps: {
                    options: verificationModeOptions,
                    'data-test-subj': 'verificationModeSelect',
                    fullWidth: true,
                    disabled: readOnly,
                    append: (
                      <EuiText size="xs" color="subdued">
                        {i18n.OPTIONAL_LABEL}
                      </EuiText>
                    ),
                  },
                }}
              />
            </>
          )}
        </>
      )}
      <UseField
        path="__internal__.hasHeaders"
        component={ToggleField}
        config={{
          defaultValue: hasHeadersDefaultValue,
          label: i18nAuth.HEADERS_SWITCH,
        }}
        componentProps={{
          euiFieldProps: {
            disabled: readOnly,
            'data-test-subj': 'openAIViewHeadersSwitch',
          },
        }}
      />
      {hasHeaders && (
        <UseArray path="config.headers" initialNumberOfItems={1}>
          {({ items, addItem, removeItem }) => {
            return (
              <>
                <EuiSpacer size="s" />
                <EuiTitle size="xxs" data-test-subj="openAIHeaderText">
                  <h5>{i18nAuth.HEADERS_TITLE}</h5>
                </EuiTitle>
                <EuiSpacer size="s" />
                {items.map((item) => (
                  <EuiFlexGroup key={item.id} css={{ marginTop: euiTheme.size.s }}>
                    <EuiFlexItem>
                      <UseField
                        path={`${item.path}.key`}
                        config={{
                          label: i18nAuth.KEY_LABEL,
                        }}
                        component={TextField}
                        readDefaultValueOnForm={!item.isNew}
                        componentProps={{
                          euiFieldProps: { readOnly, ['data-test-subj']: 'openAIHeadersKeyInput' },
                        }}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <UseField
                        path={`${item.path}.value`}
                        config={{ label: i18nAuth.VALUE_LABEL }}
                        component={TextField}
                        readDefaultValueOnForm={!item.isNew}
                        componentProps={{
                          euiFieldProps: {
                            readOnly,
                            ['data-test-subj']: 'openAIHeadersValueInput',
                          },
                        }}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        color="danger"
                        onClick={() => removeItem(item.id)}
                        iconType="minusInCircle"
                        aria-label={i18nAuth.DELETE_BUTTON}
                        style={{ marginTop: '28px' }}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                ))}
                <EuiSpacer size="m" />
                <EuiButtonEmpty
                  iconType="plusInCircle"
                  onClick={addItem}
                  data-test-subj="openAIAddHeaderButton"
                >
                  {i18nAuth.ADD_BUTTON}
                </EuiButtonEmpty>
                <EuiSpacer />
              </>
            );
          }}
        </UseArray>
      )}
      {isEdit && (
        <DashboardLink
          connectorId={id}
          connectorName={name}
          selectedProvider={selectedProviderDefaultValue}
        />
      )}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { ConnectorFields as default };
