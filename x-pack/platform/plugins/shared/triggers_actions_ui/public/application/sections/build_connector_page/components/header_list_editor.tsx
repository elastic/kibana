/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormErrorText,
  EuiFormRow,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { Controller, useFieldArray, useFormContext, useFormState } from 'react-hook-form';
import type { BuildConnectorFormData, RequestPath } from '../types';

interface Props {
  requestPath: RequestPath;
  testSubjPrefix: string;
}

const LABELS = {
  key: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.header.nameLabel', {
    defaultMessage: 'Header',
  }),
  value: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.header.valueLabel', {
    defaultMessage: 'Value',
  }),
  remove: i18n.translate(
    'xpack.triggersActionsUI.sections.buildConnectorPage.header.removeButtonLabel',
    { defaultMessage: 'Remove header' }
  ),
  add: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.header.addButtonLabel', {
    defaultMessage: 'Add header',
  }),
};

/** Key/value rows for a request's headers. */
const HeaderListEditorComponent: React.FC<Props> = ({ requestPath, testSubjPrefix }) => {
  const name = `${requestPath}.headers` as const;
  const { control } = useFormContext<BuildConnectorFormData>();
  const { fields, append, remove } = useFieldArray({ control, name });
  const { errors } = useFormState({ control, name });
  const listError: string | undefined = get(errors, `${name}.root.message`);

  return (
    <div data-test-subj={testSubjPrefix}>
      {fields.map((item, index) => (
        <React.Fragment key={item.id}>
          <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
            <EuiFlexItem grow={2}>
              <Controller
                name={`${name}.${index}.key`}
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <EuiFormRow
                    label={LABELS.key}
                    display="rowCompressed"
                    isInvalid={!!error}
                    error={error?.message}
                  >
                    <EuiFieldText
                      compressed
                      isInvalid={!!error}
                      data-test-subj={`${testSubjPrefix}-${index}-key`}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value)}
                      onBlur={field.onBlur}
                      inputRef={field.ref}
                    />
                  </EuiFormRow>
                )}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={3}>
              <Controller
                name={`${name}.${index}.value`}
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <EuiFormRow
                    label={LABELS.value}
                    display="rowCompressed"
                    isInvalid={!!error}
                    error={error?.message}
                  >
                    <EuiFieldText
                      compressed
                      isInvalid={!!error}
                      data-test-subj={`${testSubjPrefix}-${index}-value`}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value)}
                      onBlur={field.onBlur}
                      inputRef={field.ref}
                    />
                  </EuiFormRow>
                )}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormRow hasEmptyLabelSpace display="rowCompressed">
                <EuiToolTip content={LABELS.remove} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="minusCircle"
                    color="danger"
                    aria-label={LABELS.remove}
                    data-test-subj={`${testSubjPrefix}-${index}-remove`}
                    onClick={() => remove(index)}
                  />
                </EuiToolTip>
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
        </React.Fragment>
      ))}
      {listError && (
        <EuiFormErrorText data-test-subj={`${testSubjPrefix}-error`}>{listError}</EuiFormErrorText>
      )}
      <EuiButtonEmpty
        size="xs"
        iconType="plusCircle"
        onClick={() => append({ key: '', value: '' })}
        data-test-subj={`${testSubjPrefix}-add`}
      >
        {LABELS.add}
      </EuiButtonEmpty>
    </div>
  );
};

export const HeaderListEditor = memo(HeaderListEditorComponent);
