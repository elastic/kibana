/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import {
  ComboBoxField,
  Field,
  PasswordField,
} from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { ValidationConfig } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { FIELD_TYPES, getUseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { i18n } from '@kbn/i18n';

type Validations<T = any> = Array<ValidationConfig<FormData, string, T>>;

export interface CommonFieldSchema<T = any> {
  id: string;
  label: string;
  labelAppend?: ReactNode;
  helpText?: string | ReactNode;
  isRequired?: boolean;
  type?: keyof typeof FIELD_TYPES;
  euiFieldProps?: Record<string, unknown>;
  validations?: Validations<T>;
}

export interface ConfigFieldSchema<T = any> extends CommonFieldSchema<T> {
  isUrlField?: boolean;
  requireTld?: boolean;
  defaultValue?: T;
}

export interface SecretsFieldSchema extends CommonFieldSchema {
  isPasswordField?: boolean;
}

interface SimpleConnectorFormProps {
  isEdit: boolean;
  readOnly: boolean;
  configFormSchema: ConfigFieldSchema[];
  secretsFormSchema: SecretsFieldSchema[];
}

type FormRowProps = ConfigFieldSchema & SecretsFieldSchema & { readOnly: boolean };

const UseTextField = getUseField({ component: Field });
const UseComboBoxField = getUseField({ component: ComboBoxField });
const { emptyField, urlField } = fieldValidators;

const getFieldConfig = <T,>({
  label,
  labelAppend,
  isRequired = true,
  isUrlField = false,
  requireTld = true,
  defaultValue,
  type,
  validations = [],
}: {
  label: string;
  labelAppend?: ReactNode;
  isRequired?: boolean;
  isUrlField?: boolean;
  requireTld?: boolean;
  defaultValue?: T;
  type?: keyof typeof FIELD_TYPES;
  validations?: Validations<T>;
}) => ({
  label,
  labelAppend,
  validations: [
    ...(isRequired
      ? [
          {
            validator: emptyField(
              i18n.translate(
                'xpack.triggersActionsUI.sections.actionConnectorForm.error.requireFieldText',
                {
                  values: { label },
                  defaultMessage: `{label} is required.`,
                }
              )
            ),
          },
        ]
      : []),
    ...(isUrlField
      ? [
          {
            validator: urlField(
              i18n.translate(
                'xpack.triggersActionsUI.sections.actionConnectorForm.error.invalidURL',
                {
                  defaultMessage: 'Invalid URL',
                }
              ),
              { requireTld }
            ),
          },
        ]
      : []),
    ...validations,
  ],
  defaultValue,
  ...(type && FIELD_TYPES[type]
    ? { type: FIELD_TYPES[type], defaultValue: Array.isArray(defaultValue) ? defaultValue : [] }
    : {}),
});

const getComponentByType = (type?: keyof typeof FIELD_TYPES) => {
  let UseField = UseTextField;
  if (type && FIELD_TYPES[type] === FIELD_TYPES.COMBO_BOX) {
    UseField = UseComboBoxField;
  }
  return UseField;
};

const FormRow: React.FC<FormRowProps> = ({
  id,
  label,
  readOnly,
  isPasswordField,
  isRequired = true,
  isUrlField,
  labelAppend,
  helpText,
  defaultValue,
  euiFieldProps = {},
  type,
  requireTld,
  validations = [],
}) => {
  const dataTestSub = `${id}-input`;
  const UseField = getComponentByType(type);
  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          {!isPasswordField ? (
            <UseField
              path={id}
              config={getFieldConfig({
                label,
                isUrlField,
                defaultValue,
                type,
                isRequired,
                requireTld,
                validations,
                labelAppend,
              })}
              helpText={helpText}
              componentProps={{
                euiFieldProps: {
                  ...euiFieldProps,
                  readOnly,
                  fullWidth: true,
                  'data-test-subj': dataTestSub,
                },
              }}
            />
          ) : (
            <UseField
              path={id}
              config={getFieldConfig({ label, type, isRequired, validations, labelAppend })}
              helpText={helpText}
              component={PasswordField}
              componentProps={{
                euiFieldProps: {
                  ...euiFieldProps,
                  'data-test-subj': dataTestSub,
                  readOnly,
                },
              }}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

const SimpleConnectorFormComponent: React.FC<SimpleConnectorFormProps> = ({
  isEdit,
  readOnly,
  configFormSchema,
  secretsFormSchema,
}) => {
  return (
    <>
      {configFormSchema.map(({ id, ...restConfigSchema }, index) => (
        <React.Fragment key={`config.${id}`}>
          <FormRow id={`config.${id}`} {...restConfigSchema} readOnly={readOnly} />
          {index !== configFormSchema.length ? <EuiSpacer size="m" /> : null}
        </React.Fragment>
      ))}
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4>
              {i18n.translate(
                'xpack.triggersActionsUI.components.simpleConnectorForm.secrets.authenticationLabel',
                {
                  defaultMessage: 'Authentication',
                }
              )}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {secretsFormSchema.map(({ id, ...restSecretsSchema }, index) => (
        <React.Fragment key={`secrets.${id}`}>
          <FormRow
            id={`secrets.${id}`}
            key={`secrets.${id}`}
            {...restSecretsSchema}
            readOnly={readOnly}
          />
          {index !== secretsFormSchema.length ? <EuiSpacer size="m" /> : null}
        </React.Fragment>
      ))}
    </>
  );
};

export const SimpleConnectorForm = memo(SimpleConnectorFormComponent);
