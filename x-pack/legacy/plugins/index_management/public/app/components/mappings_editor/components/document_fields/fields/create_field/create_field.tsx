/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useCallback } from 'react';
import classNames from 'classnames';

import { i18n } from '@kbn/i18n';

import {
  EuiButtonEmpty,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiOutsideClickDetector,
  EuiIcon,
  EuiComboBox,
  EuiFormRow,
} from '@elastic/eui';

import { documentationService } from '../../../../../../services/documentation';
import { useForm, Form, FormDataProvider, UseField } from '../../../../shared_imports';

import { TYPE_DEFINITION, EUI_SIZE } from '../../../../constants';

import { useDispatch } from '../../../../mappings_state';
import { fieldSerializer, getFieldConfig, filterTypesForMultiField } from '../../../../lib';
import { Field, MainType, SubType, NormalizedFields, ComboBoxOption } from '../../../../types';
import { NameParameter, TypeParameter } from '../../field_parameters';
import { getParametersFormForType } from './required_parameters_forms';

const formWrapper = (props: any) => <form {...props} />;

interface Props {
  allFields: NormalizedFields['byId'];
  isMultiField?: boolean;
  paddingLeft?: number;
  isCancelable?: boolean;
  maxNestedDepth?: number;
}

export const CreateField = React.memo(function CreateFieldComponent({
  allFields,
  isMultiField,
  paddingLeft,
  isCancelable,
  maxNestedDepth,
}: Props) {
  const dispatch = useDispatch();

  const { form } = useForm<Field>({
    serializer: fieldSerializer,
    options: { stripEmptyFields: false },
  });

  useEffect(() => {
    const subscription = form.subscribe(updatedFieldForm => {
      dispatch({ type: 'fieldForm.update', value: updatedFieldForm });
    });

    return subscription.unsubscribe;
  }, [form]);

  const cancel = () => {
    dispatch({ type: 'documentField.changeStatus', value: 'idle' });
  };

  const submitForm = async (e?: React.FormEvent, exitAfter: boolean = false) => {
    if (e) {
      e.preventDefault();
    }

    const { isValid, data } = await form.submit();

    if (isValid) {
      form.reset();
      dispatch({ type: 'field.add', value: data });

      if (exitAfter) {
        cancel();
      }
    }
  };

  const onClickOutside = () => {
    const name = form.getFields().name.value as string;

    if (name.trim() === '') {
      if (isCancelable !== false) {
        cancel();
      }
    } else {
      submitForm(undefined, true);
    }
  };

  /**
   * When we change the type, we need to check if there is a subType array to choose from.
   * If there is a subType array, we build the options list for the select (and in case the field is a multi-field
   * we also filter out blacklisted types).
   *
   * @param type The selected field type
   */
  const getSubTypeMeta = (
    type: MainType
  ): { subTypeLabel?: string; subTypeOptions?: ComboBoxOption[] } => {
    const typeDefinition = TYPE_DEFINITION[type];
    const hasSubTypes = typeDefinition !== undefined && typeDefinition.subTypes;

    let subTypeOptions = hasSubTypes
      ? typeDefinition
          .subTypes!.types.map(subType => TYPE_DEFINITION[subType])
          .map(
            subType => ({ value: subType.value as SubType, label: subType.label } as ComboBoxOption)
          )
      : undefined;

    if (isMultiField && hasSubTypes) {
      // If it is a multi-field, we need to filter out non-allowed types
      subTypeOptions = filterTypesForMultiField<SubType>(subTypeOptions!);
    }

    return {
      subTypeOptions,
      subTypeLabel: hasSubTypes ? typeDefinition.subTypes!.label : undefined,
    };
  };

  const onTypeChange = (nextType: ComboBoxOption[]) => {
    form.setFieldValue('type', nextType);

    if (nextType.length) {
      const { subTypeOptions } = getSubTypeMeta(nextType[0].value as MainType);
      form.setFieldValue('subType', subTypeOptions ? [subTypeOptions[0]] : undefined);
    }
  };

  const renderFormFields = useCallback(
    ({ type }) => {
      const { subTypeOptions, subTypeLabel } = getSubTypeMeta(type);

      const docLink = documentationService.getTypeDocLink(type) as string;

      return (
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s">
            {/* Field name */}
            <EuiFlexItem>
              <NameParameter />
            </EuiFlexItem>
            {/* Field type */}
            <EuiFlexItem>
              <TypeParameter
                isMultiField={isMultiField}
                onTypeChange={onTypeChange}
                docLink={docLink}
              />
            </EuiFlexItem>
            {/* Field sub type (if any) */}
            {subTypeOptions && (
              <EuiFlexItem>
                <UseField
                  path="subType"
                  config={{
                    ...getFieldConfig('type'),
                    label: subTypeLabel,
                    defaultValue: subTypeOptions[0].value,
                  }}
                >
                  {subTypeField => {
                    const error = subTypeField.getErrorsMessages();
                    const isInvalid = error ? Boolean(error.length) : false;

                    return (
                      <EuiFormRow label={subTypeField.label} error={error} isInvalid={isInvalid}>
                        <EuiComboBox
                          placeholder={i18n.translate(
                            'xpack.idxMgmt.mappingsEditor.createField.typePlaceholderLabel',
                            {
                              defaultMessage: 'Select a type',
                            }
                          )}
                          singleSelection={{ asPlainText: true }}
                          options={subTypeOptions}
                          selectedOptions={subTypeField.value as ComboBoxOption[]}
                          onChange={newSubType => subTypeField.setValue(newSubType)}
                          isClearable={false}
                        />
                      </EuiFormRow>
                    );
                  }}
                </UseField>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      );
    },
    [form, isMultiField]
  );

  const renderFormActions = () => (
    <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
      {isCancelable !== false && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={cancel} data-test-subj="cancelButton">
            {i18n.translate('xpack.idxMgmt.mappingsEditor.createField.cancelButtonLabel', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiButton
          color="primary"
          fill
          onClick={submitForm}
          type="submit"
          data-test-subj="addButton"
        >
          {isMultiField
            ? i18n.translate('xpack.idxMgmt.mappingsEditor.createField.addMultiFieldButtonLabel', {
                defaultMessage: 'Add multi-field',
              })
            : i18n.translate('xpack.idxMgmt.mappingsEditor.createField.addFieldButtonLabel', {
                defaultMessage: 'Add field',
              })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const renderParametersForm = useCallback(
    ({ type, subType }) => {
      const ParametersForm = getParametersFormForType(type, subType);
      return ParametersForm ? (
        <div className="mappingsEditor__createFieldRequiredProps">
          <ParametersForm allFields={allFields} />
        </div>
      ) : null;
    },
    [allFields]
  );

  return (
    <EuiOutsideClickDetector onOutsideClick={onClickOutside}>
      <Form form={form} FormWrapper={formWrapper} onSubmit={submitForm}>
        <div
          className={classNames('mappingsEditor__createFieldWrapper', {
            'mappingsEditor__createFieldWrapper--toggle':
              Boolean(maxNestedDepth) && maxNestedDepth! > 0,
            'mappingsEditor__createFieldWrapper--multiField': isMultiField,
          })}
          style={{
            paddingLeft: `${
              isMultiField
                ? paddingLeft! - EUI_SIZE * 1.5 // As there are no "L" bullet list we need to substract some indent
                : paddingLeft
            }px`,
          }}
          data-test-subj="createFieldWrapper"
        >
          <div className="mappingsEditor__createFieldContent">
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <FormDataProvider pathsToWatch="type">{renderFormFields}</FormDataProvider>
              <EuiFlexItem>{renderFormActions()}</EuiFlexItem>
            </EuiFlexGroup>

            <FormDataProvider pathsToWatch={['type', 'subType']}>
              {renderParametersForm}
            </FormDataProvider>
          </div>
        </div>
      </Form>
    </EuiOutsideClickDetector>
  );
});
