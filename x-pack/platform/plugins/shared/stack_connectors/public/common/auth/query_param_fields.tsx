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
  useEuiTheme,
  EuiText,
  EuiBadge,
  EuiIconTip,
} from '@elastic/eui';
import { UseArray, UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { TextField, PasswordField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';

import { css } from '@emotion/react';

import * as i18n from './translations';

const { emptyField } = fieldValidators;

const MAX_QUERY_PARAMS = 20;

interface Props {
  readOnly: boolean;
}

export const QueryParamFields: React.FC<Props> = ({ readOnly }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiSpacer size="m" />
      <EuiTitle size="xxs" data-test-subj="webhookQueryParamsText">
        <h5>{i18n.QUERY_PARAMS_TITLE}</h5>
      </EuiTitle>

      <UseArray path="__internal__.queryParams" initialNumberOfItems={1}>
        {({ addItem, items, removeItem }) => {
          const limitExceeded = items.length >= MAX_QUERY_PARAMS;

          return (
            <>
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                <EuiFlexItem grow={false}>
                  <span>{i18n.QUERY_PARAMS_SUBTITLE}</span>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  {!limitExceeded && (
                    <EuiButton
                      iconType="plusInCircle"
                      onClick={addItem}
                      data-test-subj="webhookAddQueryParamButton"
                    >
                      {i18n.ADD_QUERY_PARAM_BUTTON}
                    </EuiButton>
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>

              {limitExceeded && (
                <EuiText size="s" color="subdued" style={{ marginTop: 8 }}>
                  {i18n.MAX_QUERY_PARAMS_LIMIT(MAX_QUERY_PARAMS)}
                </EuiText>
              )}
              <EuiSpacer size="s" />

              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <EuiBadge
                    css={css`
                      max-width: fit-content;
                    `}
                    data-test-subj="encryptedQueryParamsBadge"
                  >
                    <span
                      css={css`
                        margin-right: 5px;
                      `}
                    >
                      {i18n.ENCRYPTED_QUERY_PARAMS_BADGE}
                    </span>
                    <EuiIconTip
                      type="info"
                      size="s"
                      content={i18n.ENCRYPTED_QUERY_PARAMS_TOOLTIP_CONTENT}
                      position="top"
                    />
                  </EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />

              {items.map((item) => (
                <EuiFlexGroup key={item.id} direction="column" gutterSize="s">
                  <EuiPanel
                    hasBorder={true}
                    hasShadow={false}
                    css={{
                      marginBottom: '20px',
                      background: euiTheme.colors.backgroundBaseSubdued,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                    data-test-subj="webhookQueryParamPanel"
                  >
                    <EuiFlexGroup>
                      <EuiFlexItem>
                        <UseField
                          path={`${item.path}.key`}
                          config={{
                            label: i18n.KEY_LABEL,
                            validations: [
                              {
                                validator: emptyField(i18n.QUERY_PARAM_MISSING_KEY_ERROR),
                              },
                              {
                                validator: ({ value, form, path }) => {
                                  if (!value) return;
                                  const queryParams =
                                    form.getFormData().__internal__?.queryParams ?? [];
                                  const duplicates = queryParams.filter(
                                    (param: { key: string }, id: number) =>
                                      param.key === value &&
                                      `${path}` !== `__internal__.queryParams[${id}].key`
                                  );
                                  if (duplicates.length > 0) {
                                    return { message: i18n.SAME_QUERY_PARAM_KEY_ERROR };
                                  }
                                },
                              },
                            ],
                          }}
                          component={TextField}
                          componentProps={{
                            euiFieldProps: {
                              readOnly,
                              'data-test-subj': 'webhookQueryParamKeyInput',
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
                                validator: emptyField(i18n.QUERY_PARAM_MISSING_VALUE_ERROR),
                              },
                            ],
                          }}
                          component={PasswordField}
                          componentProps={{
                            euiFieldProps: {
                              readOnly,
                              'data-test-subj': 'webhookQueryParamValueInput',
                              type: 'dual',
                            },
                          }}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          color="danger"
                          onClick={() => removeItem(item.id)}
                          iconType="minusInCircle"
                          aria-label={i18n.DELETE_QUERY_PARAM_BUTTON}
                          data-test-subj="webhookRemoveQueryParamButton"
                          css={{
                            marginTop: '28px',
                            background: euiTheme.colors.backgroundBaseDanger,
                          }}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPanel>
                </EuiFlexGroup>
              ))}
            </>
          );
        }}
      </UseArray>
    </>
  );
};
