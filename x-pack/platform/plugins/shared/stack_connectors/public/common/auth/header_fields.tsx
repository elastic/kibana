/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiPanel,
  EuiSuperSelect,
  useEuiTheme,
  EuiFormRow,
  EuiText,
  EuiBadge,
  EuiIconTip,
} from '@elastic/eui';
import { UseArray, UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { TextField, PasswordField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';

import { css } from '@emotion/react';
import { get, isEmpty } from 'lodash';
import * as i18n from './translations';
import { headerTypeOptions } from './header_type_options';

const { emptyField } = fieldValidators;

interface Props {
  readOnly: boolean;
  maxHeaders?: number;
  required?: boolean;
}

export const HeaderFields: React.FC<Props> = ({ readOnly, maxHeaders, required = true }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiSpacer size="m" />
      <EuiTitle size="xxs" data-test-subj="webhookHeaderText">
        <h5>{i18n.HEADERS_TITLE}</h5>
      </EuiTitle>

      <UseArray path="__internal__.headers" initialNumberOfItems={1}>
        {({ addItem, items, removeItem }) => {
          const limitOfHeaderExceeded = maxHeaders ? items.length >= maxHeaders : false;

          return (
            <>
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                <EuiFlexItem grow={false}>
                  <span>{i18n.HEADERS_SUBTITLE}</span>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  {!limitOfHeaderExceeded && (
                    <EuiButton
                      iconType="plusInCircle"
                      onClick={addItem}
                      data-test-subj="webhookAddHeaderButton"
                    >
                      {i18n.ADD_BUTTON}
                    </EuiButton>
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>

              {limitOfHeaderExceeded && maxHeaders && (
                <EuiText size="s" color="subdued" style={{ marginTop: 8 }}>
                  {i18n.MAX_HEADERS_LIMIT(maxHeaders)}
                </EuiText>
              )}
              <EuiSpacer size="s" />
              {items.map((item) => (
                <UseField
                  key={item.id}
                  path={`${item.path}.type`}
                  config={{ defaultValue: headerTypeOptions[0].value }}
                >
                  {(typeField) => {
                    const headerTypeValue = typeField.value;

                    return (
                      <EuiFlexGroup direction="column" gutterSize="s">
                        {headerTypeValue === 'secret' && (
                          <EuiFlexGroup>
                            <EuiFlexItem grow={false}>
                              <EuiBadge
                                css={css`
                                  max-width: fit-content;
                                `}
                                data-test-subj="encryptedHeadersBadge"
                              >
                                <span
                                  css={css`
                                    margin-right: 5px;
                                  `}
                                >
                                  {i18n.ENCRYPTED_HEADERS_BADGE}
                                </span>
                                <EuiIconTip
                                  type="info"
                                  size="s"
                                  content={i18n.ENCRYPTED_HEADERS_TOOLTIP_CONTENT}
                                  position="top"
                                />
                              </EuiBadge>
                            </EuiFlexItem>{' '}
                          </EuiFlexGroup>
                        )}

                        <EuiPanel
                          hasBorder={true}
                          hasShadow={false}
                          css={{
                            marginBottom: '20px',
                            background:
                              headerTypeValue === 'secret'
                                ? euiTheme.colors.backgroundBaseSubdued
                                : euiTheme.colors.backgroundBasePlain,
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                          data-test-subj="webhookHeaderPanel"
                        >
                          <EuiFlexGroup>
                            <EuiFlexItem>
                              <UseField
                                path={`${item.path}.key`}
                                config={{
                                  label: i18n.KEY_LABEL,
                                  validations: [
                                    {
                                      validator: (validatorArgs) => {
                                        const { formData, path } = validatorArgs;
                                        const headerValue = get(
                                          formData,
                                          path.replace('.key', '.value')
                                        );
                                        // Key must exist if value is present
                                        if (!required && isEmpty(headerValue)) return;
                                        return emptyField(i18n.HEADER_MISSING_KEY_ERROR)(
                                          validatorArgs
                                        );
                                      },
                                    },
                                    {
                                      validator: ({ value, form, path }) => {
                                        if (!value) return;
                                        const headers =
                                          form.getFormData().__internal__?.headers ?? [];

                                        const duplicates = headers.filter(
                                          (header: { key: string }, id: number) =>
                                            header.key === value &&
                                            `${path}` !== `__internal__.headers[${id}].key`
                                        );

                                        if (duplicates.length > 0) {
                                          return {
                                            message: i18n.SAME_HEADER_KEY_ERROR,
                                          };
                                        }
                                      },
                                    },
                                  ],
                                }}
                                component={TextField}
                                componentProps={{
                                  euiFieldProps: {
                                    readOnly,
                                    'data-test-subj': 'webhookHeadersKeyInput',
                                  },
                                }}
                              />
                            </EuiFlexItem>
                            <EuiFlexItem>
                              <UseField
                                path={`${item.path}.value`}
                                config={{
                                  label: i18n.VALUE_LABEL,
                                  validations: [
                                    {
                                      validator: (validatorArgs) => {
                                        const { formData, path } = validatorArgs;
                                        const headerKey = get(
                                          formData,
                                          path.replace('.value', '.key')
                                        );
                                        // Value must exist if key is present
                                        if (!required && isEmpty(headerKey)) return;
                                        return emptyField(i18n.HEADER_MISSING_VALUE_ERROR)(
                                          validatorArgs
                                        );
                                      },
                                    },
                                  ],
                                }}
                                component={headerTypeValue === 'secret' ? PasswordField : TextField}
                                componentProps={{
                                  euiFieldProps: {
                                    readOnly,
                                    'data-test-subj':
                                      headerTypeValue === 'secret'
                                        ? 'webhookHeadersSecretValueInput'
                                        : 'webhookHeadersValueInput',
                                    type: headerTypeValue === 'secret' ? 'dual' : 'text',
                                  },
                                }}
                              />
                            </EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              <EuiFormRow label={i18n.HEADER_TYPE_LABEL}>
                                <EuiSuperSelect
                                  options={headerTypeOptions}
                                  valueOfSelected={headerTypeValue}
                                  onChange={(val) => typeField.setValue(val)}
                                  hasDividers
                                  fullWidth
                                  data-test-subj="webhookHeaderTypeSelect"
                                />
                              </EuiFormRow>
                            </EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              <EuiButtonIcon
                                color="danger"
                                onClick={() => removeItem(item.id)}
                                iconType="minusInCircle"
                                aria-label={i18n.DELETE_BUTTON}
                                data-test-subj="webhookRemoveHeaderButton"
                                css={{
                                  marginTop: '28px',
                                  background: euiTheme.colors.backgroundBaseDanger,
                                }}
                              />
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </EuiPanel>
                      </EuiFlexGroup>
                    );
                  }}
                </UseField>
              ))}
            </>
          );
        }}
      </UseArray>
    </>
  );
};
