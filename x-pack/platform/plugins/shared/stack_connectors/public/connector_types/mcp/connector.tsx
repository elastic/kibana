/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiFlexGroup,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ActionConnectorFieldsProps } from '@kbn/alerts-ui-shared';
import { MCPAuthType } from '@kbn/connector-schemas/mcp';
import {
  CardRadioGroupField,
  HiddenField,
  TextField,
} from '@kbn/es-ui-shared-plugin/static/forms/components';
import {
  UseField as Field,
  useFormContext,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import React, { useEffect } from 'react';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import useToggle from 'react-use/lib/useToggle';
import { HeaderFields } from '../../common/auth/header_fields';
import { OAuthAuthCodeFields } from './oauth_auth_code_fields';
import { mcpErrorStrings, mcpFieldStrings } from './translations';
import { useSecretHeaders } from '../../common/auth/use_secret_headers';
import { mergeSecretHeaders } from './utils/form';

const additionalSettingsStyles = css`
  inline-size: fit-content;
  flex-grow: 0;
`;

const authTypeSelectorStyles = css`
  border: none;
  margin: 0;
  min-inline-size: 0;
  padding: 0;
`;

const ConnectorFields: React.FC<ActionConnectorFieldsProps> = ({ readOnly, isEdit, authMode }) => {
  const additionalSettingsId = useGeneratedHtmlId({ prefix: 'additionalSettings' });
  const { emptyField, urlField } = fieldValidators;
  const [isOpen, toggleIsOpen] = useToggle(false);

  const form = useFormContext();
  const { getFormData, updateFieldValues, getFieldDefaultValue } = form;
  const [{ id: connectorId, config }] = useFormData({
    watch: ['id', 'config.authType'],
  });
  const authType = config?.authType ?? MCPAuthType.None;
  const authTypeDisabled = readOnly || (isEdit && authMode === 'per-user');

  const hasHeadersDefaultValue = !!getFieldDefaultValue<boolean | undefined>('config.headers');

  const {
    data: secretHeaderKeys = [],
    isLoading,
    isFetching,
  } = useSecretHeaders(connectorId, isEdit, {
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const isLoadingSecretHeaders = isLoading || isFetching;

  useEffect(() => {
    if (isLoadingSecretHeaders) return;

    const mergedHeaders = mergeSecretHeaders(secretHeaderKeys, getFormData());
    const hasHeaders = mergedHeaders.length > 0;

    updateFieldValues(
      { __internal__: { hasHeaders, headers: mergedHeaders } },
      { runDeserializer: false }
    );
    toggleIsOpen(hasHeaders);
  }, [isLoadingSecretHeaders, secretHeaderKeys, getFormData, updateFieldValues, toggleIsOpen]);

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <Field
        path="config.serverUrl"
        component={TextField}
        config={{
          label: mcpFieldStrings.serverUrl.label,
          validations: [
            {
              validator: emptyField(mcpErrorStrings.required(mcpFieldStrings.serverUrl.label)),
            },
            {
              validator: urlField(mcpErrorStrings.invalid(mcpFieldStrings.serverUrl.label)),
            },
          ],
        }}
      />
      <fieldset
        disabled={authTypeDisabled}
        data-test-subj="mcpAuthTypeSelector"
        css={authTypeSelectorStyles}
      >
        <Field
          path="config.authType"
          defaultValue={MCPAuthType.None}
          component={CardRadioGroupField}
          config={{
            label: mcpFieldStrings.authType.label,
          }}
          componentProps={{
            options: [
              {
                value: MCPAuthType.None,
                label: mcpFieldStrings.authTypeNone.label,
                'data-test-subj': 'mcpAuthTypeNone',
                children: (
                  <EuiText size="s" color="subdued">
                    {mcpFieldStrings.authTypeNone.description}
                  </EuiText>
                ),
              },
              {
                value: MCPAuthType.OAuthAuthorizationCode,
                label: mcpFieldStrings.authTypeOAuthAuthorizationCode.label,
                'data-test-subj': 'mcpAuthTypeOAuthAuthorizationCode',
                children: (
                  <EuiText size="s" color="subdued">
                    {mcpFieldStrings.authTypeOAuthAuthorizationCode.description}
                  </EuiText>
                ),
              },
            ],
          }}
        />
      </fieldset>
      {authType === MCPAuthType.OAuthAuthorizationCode && (
        <OAuthAuthCodeFields readOnly={readOnly} />
      )}
      <EuiAccordion
        id={additionalSettingsId}
        arrowDisplay="right"
        buttonProps={{
          css: additionalSettingsStyles,
        }}
        onToggle={toggleIsOpen}
        forceState={isOpen ? 'open' : 'closed'}
        buttonContent={mcpFieldStrings.additionalSettings.label}
        initialIsOpen={isEdit}
      >
        <EuiSpacer size="m" />
        <EuiPanel hasShadow={false} hasBorder={true}>
          {/* Workaround to resolve updates to the headers field for secrets */}
          <Field
            path="__internal__.hasHeaders"
            component={HiddenField}
            config={{ defaultValue: hasHeadersDefaultValue }}
          />
          <HeaderFields readOnly={readOnly} required={false} />
        </EuiPanel>
      </EuiAccordion>
    </EuiFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export default ConnectorFields;
