/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiFieldText,
  EuiFormRow,
  EuiText,
} from '@elastic/eui';

import {
  UseField,
  ArrayItem,
  ValidationFunc,
  getFieldValidityAndErrorMessage,
} from '../../../../../../shared_imports';

import './input_list.scss';

interface Props {
  label: string;
  helpText: React.ReactNode;
  error: string | null;
  value: ArrayItem[];
  onAdd: () => void;
  onRemove: (id: number) => void;
  addLabel: string;
  /**
   * Validation to be applied to every text item
   */
  textValidations?: Array<ValidationFunc<any, string, string>>;
  /**
   * Serializer to be applied to every text item
   */
  textSerializer?: <O = string>(v: string) => O;
  /**
   * Deserializer to be applied to every text item
   */
  textDeserializer?: (v: unknown) => string;
}

const i18nTexts = {
  removeItemButtonAriaLabel: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.inputList.removeItemLabel',
    { defaultMessage: 'Remove item' }
  ),
};

export function InputList({
  label,
  helpText,
  error,
  value,
  onAdd,
  onRemove,
  addLabel,
  textValidations,
  textDeserializer,
  textSerializer,
}: Props): JSX.Element {
  const [firstItemId] = useState(() => uuidv4());

  return (
    <EuiFormRow
      isInvalid={typeof error === 'string'}
      error={error}
      fullWidth
      data-test-subj="droppableList"
    >
      <>
        <EuiFlexGroup
          className="pipelineProcessorsEditor__form__inputList__labelContainer"
          justifyContent="flexStart"
          direction="column"
          gutterSize="none"
        >
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <label htmlFor={firstItemId}>
                <strong>{label}</strong>
              </label>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              <p>{helpText}</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        <div className="pipelineProcessorsEditor__form__inputList__panel">
          {value.map((item, idx) => (
            <EuiFlexGroup
              key={idx}
              className="pipelineProcessorsEditor__form__inputList__item"
              justifyContent="center"
              gutterSize="none"
            >
              <EuiFlexItem>
                <UseField<string>
                  path={item.path}
                  config={{
                    validations: textValidations
                      ? textValidations.map((validator) => ({ validator }))
                      : undefined,
                    deserializer: textDeserializer,
                    serializer: textSerializer,
                  }}
                  readDefaultValueOnForm={!item.isNew}
                >
                  {(field) => {
                    const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
                    return (
                      <EuiFormRow isInvalid={isInvalid} error={errorMessage} fullWidth>
                        <EuiFieldText
                          data-test-subj={`input-${idx}`}
                          id={idx === 0 ? firstItemId : undefined}
                          isInvalid={isInvalid}
                          value={field.value}
                          onChange={field.onChange}
                          compressed
                          fullWidth
                        />
                      </EuiFormRow>
                    );
                  }}
                </UseField>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {value.length > 1 ? (
                  <EuiButtonIcon
                    aria-label={i18nTexts.removeItemButtonAriaLabel}
                    className="pipelineProcessorsEditor__form__inputList__removeButton"
                    iconType="minusInCircle"
                    color="danger"
                    onClick={() => onRemove(item.id)}
                    size="s"
                  />
                ) : (
                  <EuiIcon
                    className="pipelineProcessorsEditor__form__inputList__removeButton"
                    type="empty"
                  />
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          ))}
          <EuiButtonEmpty iconType="plusInCircle" onClick={onAdd} data-test-subj="addButton">
            {addLabel}
          </EuiButtonEmpty>
        </div>
      </>
    </EuiFormRow>
  );
}
