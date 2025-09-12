/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Field, PasswordField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { AdditionalFields } from '../components/additional_fields';
import * as i18n from './translations';

interface OAuth2FieldsProps {
  readOnly: boolean;
}

export const jsonValidator = ({ value }: { value: string | null | undefined }) => {
  if (!value) {
    return undefined;
  }
  try {
    const parsedValue = JSON.parse(value);
    if (typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
      return { message: i18n.INVALID_JSON };
    }
    return undefined;
  } catch (e) {
    return { message: i18n.INVALID_JSON };
  }
};

interface AdditionalFieldsWrapperProps {
  field: {
    value: string | null | undefined;
    setValue: (value: string | null) => void;
    errors?: Array<{ message: string; [key: string]: any }>;
  };
  readOnly?: boolean;
  isOptionalField?: boolean;
}

const AdditionalFieldsWrapper: React.FC<AdditionalFieldsWrapperProps> = React.memo(
  ({ field: { value, setValue, errors }, readOnly, isOptionalField }) => {
    const handleAdditionalFieldsChange = useCallback(
      (json: string | null) => {
        setValue(json);
      },
      [setValue]
    );

    const errorsProp = errors && errors.length > 0 ? [errors[0].message] : [];
    return (
      <AdditionalFields
        value={value}
        onChange={handleAdditionalFieldsChange}
        errors={errorsProp}
        isOptionalField={isOptionalField}
        readOnly={readOnly}
        helpText={i18n.ADDITIONAL_FIELDS_HELP_WEBHOOK_TEXT}
      />
    );
  }
);

export const OAuth2Fields: React.FC<OAuth2FieldsProps> = ({ readOnly }) => {
  const { emptyField, urlField } = fieldValidators;

  return (
    <EuiFlexGroup justifyContent="spaceBetween" data-test-subj="basicAuthFields">
      <EuiFlexItem>
        <UseField
          path="config.accessTokenUrl"
          config={{
            label: i18n.ACCESS_TOKEN_URL,
            validations: [
              {
                validator: urlField(i18n.ACCESS_TOKEN_URL_REQUIRED),
              },
            ],
          }}
          component={Field}
          componentProps={{
            euiFieldProps: { readOnly, 'data-test-subj': 'accessTokenUrlAOuth2', fullWidth: true },
          }}
        />
        <EuiSpacer size="s" />
        <UseField
          path="config.clientId"
          config={{
            label: i18n.CLIENT_ID,
            validations: [
              {
                validator: emptyField(i18n.CLIENT_ID_REQUIRED),
              },
            ],
          }}
          component={Field}
          componentProps={{
            euiFieldProps: {
              'data-test-subj': 'clientIdOAuth2',
              readOnly,
            },
          }}
        />
        <EuiSpacer size="s" />
        <UseField
          path="secrets.clientSecret"
          config={{
            label: i18n.CLIENT_SECRET,
            validations: [
              {
                validator: emptyField(i18n.CLIENT_SECRET_REQUIRED),
              },
            ],
          }}
          component={PasswordField}
          componentProps={{
            euiFieldProps: {
              'data-test-subj': 'clientSecretOAuth2',
              readOnly,
            },
          }}
        />
        <EuiSpacer size="s" />
        <UseField
          path="config.scope"
          config={{
            label: i18n.SCOPE,
            helpText: i18n.SCOPE_HELP_TEXT,
            labelAppend: (
              <EuiText size="xs" color="subdued">
                {i18n.OPTIONAL_LABEL}
              </EuiText>
            ),
          }}
          component={Field}
          componentProps={{
            euiFieldProps: {
              'data-test-subj': 'ScopeOAuth2',
              readOnly,
            },
          }}
        />
        <EuiSpacer size="s" />
        <UseField
          path="config.additionalFields"
          config={{
            label: i18n.ADDITIONAL_FIELDS,
            validations: [
              {
                validator: jsonValidator,
              },
            ],
          }}
          component={AdditionalFieldsWrapper}
          componentProps={{
            euiFieldProps: {
              'data-test-subj': 'AdditionalFieldsOAuth2',
            },
            isOptionalField: true,
            readOnly,
          }}
        />
        <EuiSpacer size="s" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
