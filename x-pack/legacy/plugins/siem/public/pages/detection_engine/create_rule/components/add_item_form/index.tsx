/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiButtonIcon, EuiFormRow, EuiFieldText, EuiSpacer } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { ChangeEvent, useCallback, useEffect, useState, useRef } from 'react';

import { FieldHook, getFieldValidityAndErrorMessage } from '../shared_imports';
import * as CreateRuleI18n from '../../translations';

interface AddItemProps {
  addText: string;
  field: FieldHook;
  dataTestSubj: string;
  idAria: string;
  isDisabled: boolean;
}

export const AddItem = ({ addText, dataTestSubj, field, idAria, isDisabled }: AddItemProps) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  // const [items, setItems] = useState(['']);
  const [haveBeenKeyboardDeleted, setHaveBeenKeyboardDeleted] = useState(-1);

  const inputsRef = useRef<HTMLInputElement[]>([]);

  const removeItem = useCallback(
    (index: number) => {
      const values = field.value as string[];
      field.setValue([...values.slice(0, index), ...values.slice(index + 1)]);
      inputsRef.current = [
        ...inputsRef.current.slice(0, index),
        ...inputsRef.current.slice(index + 1),
      ];
      inputsRef.current = inputsRef.current.map((ref, i) => {
        if (i >= index && inputsRef.current[index] != null) {
          ref.value = 're-render';
        }
        return ref;
      });
    },
    [field]
  );

  const addItem = useCallback(() => {
    const values = field.value as string[];
    if (!isEmpty(values) && values[values.length - 1]) {
      field.setValue([...values, '']);
    } else if (isEmpty(values)) {
      field.setValue(['']);
    }
  }, [field]);

  const updateItem = useCallback(
    (event: ChangeEvent<HTMLInputElement>, index: number) => {
      event.persist();
      const values = field.value as string[];
      const value = event.target.value;
      if (isEmpty(value)) {
        field.setValue([...values.slice(0, index), ...values.slice(index + 1)]);
        inputsRef.current = [
          ...inputsRef.current.slice(0, index),
          ...inputsRef.current.slice(index + 1),
        ];
        setHaveBeenKeyboardDeleted(inputsRef.current.length - 1);
        inputsRef.current = inputsRef.current.map((ref, i) => {
          if (i >= index && inputsRef.current[index] != null) {
            ref.value = 're-render';
          }
          return ref;
        });
      } else {
        field.setValue([...values.slice(0, index), value, ...values.slice(index + 1)]);
      }
    },
    [field]
  );

  const handleLastInputRef = useCallback(
    (index: number, element: HTMLInputElement | null) => {
      if (element != null) {
        inputsRef.current = [
          ...inputsRef.current.slice(0, index),
          element,
          ...inputsRef.current.slice(index + 1),
        ];
      }
    },
    [inputsRef]
  );

  useEffect(() => {
    if (
      haveBeenKeyboardDeleted !== -1 &&
      !isEmpty(inputsRef.current) &&
      inputsRef.current[haveBeenKeyboardDeleted] != null
    ) {
      inputsRef.current[haveBeenKeyboardDeleted].focus();
      setHaveBeenKeyboardDeleted(-1);
    }
  }, [haveBeenKeyboardDeleted, inputsRef.current]);

  const values = field.value as string[];
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
        {values.map((item, index) => {
          const euiFieldProps = {
            disabled: isDisabled,
            ...(index === values.length - 1
              ? { inputRef: handleLastInputRef.bind(null, index) }
              : {}),
            ...((inputsRef.current[index] != null && inputsRef.current[index].value !== item) ||
            inputsRef.current[index] == null
              ? { value: item }
              : {}),
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
                    aria-label={CreateRuleI18n.DELETE}
                  />
                }
                onChange={e => updateItem(e, index)}
                compressed
                fullWidth
                {...euiFieldProps}
              />
              {values.length - 1 !== index && <EuiSpacer size="s" />}
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
