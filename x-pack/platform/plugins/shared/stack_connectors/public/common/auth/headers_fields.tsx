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
  EuiIcon,
  EuiSuperSelect,
  useEuiTheme,
  EuiFormRow,
} from '@elastic/eui';
import { UseArray, UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { TextField, PasswordField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';

import * as i18n from './translations';

const { emptyField } = fieldValidators;

interface Props {
  readOnly: boolean;
}

const headerTypeOptions = [
  {
    value: 'config',
    inputDisplay: (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="controls" size="s" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <span>{i18n.CONFIG_OPTION}</span>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    'data-test-subj': 'option-config',
  },
  {
    value: 'secret',
    inputDisplay: (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="lock" size="s" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <span>{i18n.SECRET_OPTION}</span>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    'data-test-subj': 'option-secret',
  },
];

export const HeadersFields: React.FC<Props> = ({ readOnly }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiSpacer size="m" />
      <EuiTitle size="xxs" data-test-subj="webhookHeaderText">
        <h5>{i18n.HEADERS_TITLE}</h5>
      </EuiTitle>

      <UseArray path="__internal__.headers" initialNumberOfItems={1}>
        {({ addItem, items, removeItem }) => (
          <>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem grow={false}>
                <span>{i18n.HEADERS_SUBTITLE}</span>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  iconType="plusInCircle"
                  onClick={addItem}
                  data-test-subj="webhookAddHeaderButton"
                >
                  {i18n.ADD_BUTTON}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>

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
                    <EuiFlexGroup>
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
                      >
                        <EuiFlexGroup>
                          {/* Header Key */}
                          <EuiFlexItem>
                            <UseField
                              path={`${item.path}.key`}
                              config={{ label: i18n.KEY_LABEL }}
                              component={TextField}
                              componentProps={{
                                euiFieldProps: {
                                  readOnly,
                                  'data-test-subj': 'webhookHeadersKeyInput',
                                },
                              }}
                            />
                          </EuiFlexItem>

                          {/* Header Value */}
                          <EuiFlexItem>
                            <UseField
                              path={`${item.path}.value`}
                              config={{
                                label: i18n.VALUE_LABEL,
                                validations:
                                  headerTypeValue === 'secret'
                                    ? [
                                        {
                                          validator: emptyField(
                                            i18n.SECRET_HEADER_MISSING_VALUE_ERROR
                                          ),
                                        },
                                      ]
                                    : [],
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

                          {/* Header Type */}
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

                          {/* Remove button */}
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
        )}
      </UseArray>
    </>
  );
};
