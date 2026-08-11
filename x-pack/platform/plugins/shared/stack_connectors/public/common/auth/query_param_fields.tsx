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
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { UseArray, UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { TextField, PasswordField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';

import * as i18n from './translations';

const { emptyField, maxLengthField } = fieldValidators;

const MAX_QUERY_PARAMS = 20;
const MAX_KEY_LENGTH = 256;
const MAX_VALUE_LENGTH = 2048;

interface Props {
  readOnly: boolean;
}

export const QueryParamFields: React.FC<Props> = ({ readOnly }) => {
  return (
    <>
      <EuiSpacer size="m" />
      <EuiTitle size="xxs" data-test-subj="httpQueryParamsText">
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
                      disabled={readOnly}
                      data-test-subj="httpAddQueryParamButton"
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

              {items.map((item) => (
                <EuiPanel
                  key={item.id}
                  hasBorder={true}
                  hasShadow={false}
                  css={{ marginBottom: 20 }}
                  data-test-subj="httpQueryParamPanel"
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
                              validator: maxLengthField({
                                length: MAX_KEY_LENGTH,
                                message: i18n.QUERY_PARAM_KEY_TOO_LONG(MAX_KEY_LENGTH),
                              }),
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
                            'data-test-subj': 'httpQueryParamKeyInput',
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
                            {
                              validator: maxLengthField({
                                length: MAX_VALUE_LENGTH,
                                message: i18n.QUERY_PARAM_VALUE_TOO_LONG(MAX_VALUE_LENGTH),
                              }),
                            },
                          ],
                        }}
                        component={PasswordField}
                        componentProps={{
                          euiFieldProps: {
                            readOnly,
                            'data-test-subj': 'httpQueryParamValueInput',
                            type: 'dual',
                          },
                        }}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiToolTip
                        content={i18n.DELETE_QUERY_PARAM_BUTTON}
                        disableScreenReaderOutput
                      >
                        <EuiButtonIcon
                          color="danger"
                          onClick={() => removeItem(item.id)}
                          iconType="minusInCircle"
                          disabled={readOnly}
                          aria-label={i18n.DELETE_QUERY_PARAM_BUTTON}
                          data-test-subj="httpRemoveQueryParamButton"
                          css={{ marginTop: 28 }}
                        />
                      </EuiToolTip>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              ))}
            </>
          );
        }}
      </UseArray>
    </>
  );
};
