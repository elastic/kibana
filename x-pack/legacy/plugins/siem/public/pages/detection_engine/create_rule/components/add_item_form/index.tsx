/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiButtonIcon, EuiFormRow, EuiFieldText, EuiSpacer } from '@elastic/eui';
import React, { ChangeEvent, useCallback, useEffect, useState, useRef } from 'react';

import { isEmpty, isEqual } from 'lodash/fp';
import { FieldHook } from '../../../../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib';
import { getFieldValidityAndErrorMessage } from '../../../../../../../../../../src/plugins/es_ui_shared/static/forms/components/helpers';

import * as I18n from './translations';

interface AddItemProps {
  addText: string;
  field: FieldHook;
  dataTestSubj: string;
  idAria: string;
  isDisabled: boolean;
}
export const AddItem = ({ addText, dataTestSubj, field, idAria, isDisabled }: AddItemProps) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const [items, setItems] = useState(['']);
  const [haveBeenKeyboardDeleted, setHaveBeenKeyboardDeleted] = useState(false);

  const lastInputRef = useRef<HTMLInputElement | null>(null);

  const removeItem = useCallback(
    (index: number) => {
      const values = field.value as string[];
      field.setValue([...values.slice(0, index), ...values.slice(index + 1)]);
    },
    [field]
  );

  const addItem = useCallback(() => {
    const values = field.value as string[];
    if (!isEmpty(values[values.length - 1])) {
      field.setValue([...values, '']);
    }
  }, [field]);

  const updateItem = useCallback(
    (event: ChangeEvent<HTMLInputElement>, index: number) => {
      const values = field.value as string[];
      const value = event.target.value;
      if (isEmpty(value)) {
        setHaveBeenKeyboardDeleted(true);
        field.setValue([...values.slice(0, index), ...values.slice(index + 1)]);
      } else {
        field.setValue([...values.slice(0, index), value, ...values.slice(index + 1)]);
      }
    },
    [field]
  );

  const handleLastInputRef = useCallback(
    (element: HTMLInputElement | null) => {
      lastInputRef.current = element;
    },
    [lastInputRef]
  );

  useEffect(() => {
    if (!isEqual(field.value, items)) {
      setItems(
        isEmpty(field.value)
          ? ['']
          : haveBeenKeyboardDeleted
          ? [...(field.value as string[]), '']
          : (field.value as string[])
      );
      setHaveBeenKeyboardDeleted(false);
    }
  }, [field.value]);

  useEffect(() => {
    if (!haveBeenKeyboardDeleted && lastInputRef != null && lastInputRef.current != null) {
      lastInputRef.current.focus();
    }
  }, [haveBeenKeyboardDeleted, lastInputRef]);

  return (
    <EuiFormRow
      label={field.label}
      labelAppend={field.labelAppend}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
      data-test-subj={dataTestSubj}
      describedByIds={idAria ? [idAria] : undefined}
    >
      <>
        {items.map((item, index) => {
          const euiFieldProps = {
            isDisabled,
            ...(index === items.length - 1 ? { inputRef: handleLastInputRef } : {}),
          };
          return (
            <div key={index}>
              <EuiFieldText
                append={
                  <EuiButtonIcon
                    color="danger"
                    iconType="trash"
                    isDisabled={isDisabled}
                    onClick={() => removeItem(index)}
                    aria-label={I18n.DELETE}
                  />
                }
                value={item}
                onChange={e => updateItem(e, index)}
                compressed
                fullWidth
                {...euiFieldProps}
              />
              {items.length - 1 !== index && <EuiSpacer size="s" />}
            </div>
          );
        })}

        <EuiButtonEmpty size="xs" onClick={addItem} isDisabled={isDisabled}>
          {addText}
        </EuiButtonEmpty>
      </>
    </EuiFormRow>
  );
};
