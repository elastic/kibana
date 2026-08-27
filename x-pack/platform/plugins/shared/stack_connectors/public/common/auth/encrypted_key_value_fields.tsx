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
import { PasswordField, TextField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { UseArray, UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';

const { emptyField, maxLengthField } = fieldValidators;
const MAX_ITEMS = 20;
const MAX_KEY_LENGTH = 256;
const MAX_VALUE_LENGTH = 2048;

interface EncryptedKeyValueFieldsProps {
  readOnly: boolean;
  path: string;
  title: string;
  subtitle: string;
  subtitleGrow: boolean;
  titleTestSubject: string;
  panelTestSubject: string;
  keyInputTestSubject: string;
  valueInputTestSubject: string;
  addButtonTestSubject: string;
  removeButtonTestSubject: string;
  addButtonLabel: string;
  removeButtonLabel: string;
  keyLabel: string;
  valueLabel: string;
  missingKeyMessage: string;
  missingValueMessage: string;
  duplicateKeyMessage: string;
  maxItemsMessage: (max: number) => string;
  keyTooLongMessage: (max: number) => string;
  valueTooLongMessage: (max: number) => string;
  validateKey?: (value: unknown) => string | undefined;
}

export const EncryptedKeyValueFields: React.FC<EncryptedKeyValueFieldsProps> = ({
  readOnly,
  path: arrayPath,
  title,
  subtitle,
  subtitleGrow,
  titleTestSubject,
  panelTestSubject,
  keyInputTestSubject,
  valueInputTestSubject,
  addButtonTestSubject,
  removeButtonTestSubject,
  addButtonLabel,
  removeButtonLabel,
  keyLabel,
  valueLabel,
  missingKeyMessage,
  missingValueMessage,
  duplicateKeyMessage,
  maxItemsMessage,
  keyTooLongMessage,
  valueTooLongMessage,
  validateKey,
}) => (
  <>
    <EuiSpacer size="m" />
    <EuiTitle size="xxs" data-test-subj={titleTestSubject}>
      <h5>{title}</h5>
    </EuiTitle>
    <UseArray path={arrayPath} initialNumberOfItems={1}>
      {({ addItem, items, removeItem }) => {
        const limitExceeded = items.length >= MAX_ITEMS;
        return (
          <>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem grow={subtitleGrow}>
                <span>{subtitle}</span>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {!limitExceeded && (
                  <EuiButton
                    iconType="plusCircle"
                    onClick={addItem}
                    disabled={readOnly}
                    data-test-subj={addButtonTestSubject}
                  >
                    {addButtonLabel}
                  </EuiButton>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
            {limitExceeded && (
              <EuiText size="s" color="subdued" css={{ marginTop: 8 }}>
                {maxItemsMessage(MAX_ITEMS)}
              </EuiText>
            )}
            <EuiSpacer size="s" />
            {items.map((item) => (
              <EuiPanel
                key={item.id}
                hasBorder
                hasShadow={false}
                css={{ marginBottom: 20 }}
                data-test-subj={panelTestSubject}
              >
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <UseField
                      path={`${item.path}.key`}
                      config={{
                        label: keyLabel,
                        validations: [
                          { validator: emptyField(missingKeyMessage) },
                          {
                            validator: maxLengthField({
                              length: MAX_KEY_LENGTH,
                              message: keyTooLongMessage(MAX_KEY_LENGTH),
                            }),
                          },
                          {
                            validator: ({ value }) => {
                              const message = validateKey?.(value);
                              return message ? { message } : undefined;
                            },
                          },
                          {
                            validator: ({ value, form, path }) => {
                              if (!value) return;
                              const formData = form.getFormData() as {
                                __internal__?: Record<string, Array<{ key: string }>>;
                              };
                              const fieldName = arrayPath.replace('__internal__.', '');
                              const values = formData.__internal__?.[fieldName] ?? [];
                              const duplicate = values.some(
                                ({ key }, index) =>
                                  key === value && `${path}` !== `${arrayPath}[${index}].key`
                              );
                              return duplicate ? { message: duplicateKeyMessage } : undefined;
                            },
                          },
                        ],
                      }}
                      component={TextField}
                      componentProps={{
                        euiFieldProps: {
                          readOnly,
                          'data-test-subj': keyInputTestSubject,
                        },
                      }}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <UseField
                      path={`${item.path}.value`}
                      config={{
                        label: valueLabel,
                        validations: [
                          { validator: emptyField(missingValueMessage) },
                          {
                            validator: maxLengthField({
                              length: MAX_VALUE_LENGTH,
                              message: valueTooLongMessage(MAX_VALUE_LENGTH),
                            }),
                          },
                        ],
                      }}
                      component={PasswordField}
                      componentProps={{
                        euiFieldProps: {
                          readOnly,
                          type: 'dual',
                          'data-test-subj': valueInputTestSubject,
                        },
                      }}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiToolTip content={removeButtonLabel} disableScreenReaderOutput>
                      <EuiButtonIcon
                        color="danger"
                        onClick={() => removeItem(item.id)}
                        iconType="minusCircle"
                        disabled={readOnly}
                        aria-label={removeButtonLabel}
                        data-test-subj={removeButtonTestSubject}
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
