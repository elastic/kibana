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
import { ExperimentalFeaturesService } from '../../common/experimental_features_service';
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
  getOpenAiConfig,
} from './constants';

const { emptyField } = fieldValidators;
const ConnectorFields: React.FC<ActionConnectorFieldsProps> = ({ readOnly, isEdit }) => {
  const { euiTheme } = useEuiTheme();
  const { getFieldDefaultValue } = useFormContext();
  const [{ config, __internal__, id, name }] = useFormData({
    watch: ['config.apiProvider', '__internal__.hasHeaders'],
  });
  const enabledAdditionalHeaders = ExperimentalFeaturesService.get().openAIAdditionalHeadersOn;
  const hasHeaders = __internal__ != null ? __internal__.hasHeaders : false;
  const hasHeadersDefaultValue = !!getFieldDefaultValue<boolean | undefined>('config.headers');

  const selectedProviderDefaultValue = useMemo(
    () =>
      getFieldDefaultValue<OpenAiProviderType>('config.apiProvider') ?? OpenAiProviderType.OpenAi,
    [getFieldDefaultValue]
  );

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
          configFormSchema={getOpenAiConfig(enabledAdditionalHeaders)}
          secretsFormSchema={openAiSecrets}
        />
      )}
      {/* ^v These are intentionally not if/else because of the way the `config.defaultValue` renders */}
      {config != null && config.apiProvider === OpenAiProviderType.AzureAi && (
        <SimpleConnectorForm
          isEdit={isEdit}
          readOnly={readOnly}
          configFormSchema={azureAiConfig}
          secretsFormSchema={azureAiSecrets}
        />
      )}
      {config != null && config.apiProvider === OpenAiProviderType.Other && (
        <SimpleConnectorForm
          isEdit={isEdit}
          readOnly={readOnly}
          configFormSchema={otherOpenAiConfig}
          secretsFormSchema={otherOpenAiSecrets}
        />
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
                        // This is needed because when you delete
                        // a row and add a new one, the stale values will appear
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
