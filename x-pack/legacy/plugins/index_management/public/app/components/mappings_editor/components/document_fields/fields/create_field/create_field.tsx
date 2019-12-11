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
} from '@elastic/eui';

import { useForm, Form, FormDataProvider, SelectField, UseField } from '../../../../shared_imports';

import { TYPE_DEFINITION, FIELD_TYPES_OPTIONS, EUI_SIZE } from '../../../../constants';

import { useDispatch } from '../../../../mappings_state';
import { fieldSerializer, getFieldConfig, filterTypesForMultiField } from '../../../../lib';
import { Field, MainType, SubType, NormalizedFields, SelectOption } from '../../../../types';
import { NameParameter } from '../../field_parameters';
import { getParametersFormForType } from './required_parameters_forms';

const formWrapper = (props: any) => <form {...props} />;

interface Props {
  allFields: NormalizedFields['byId'];
  isMultiField?: boolean;
  paddingLeft?: number;
  isCancelable?: boolean;
  maxNestedDepth?: number;
}

const typeFieldConfig = getFieldConfig('type');

export const CreateField = React.memo(function CreateFieldComponent({
  allFields,
  isMultiField,
  paddingLeft,
  isCancelable,
  maxNestedDepth,
}: Props) {
  const dispatch = useDispatch();

  const { form } = useForm<Field>({ serializer: fieldSerializer });

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
  ): { subTypeLabel?: string; subTypeOptions?: Array<SelectOption<SubType>> } => {
    const typeDefinition = TYPE_DEFINITION[type];
    const hasSubTypes = typeDefinition !== undefined && typeDefinition.subTypes;

    let subTypeOptions = hasSubTypes
      ? typeDefinition
          .subTypes!.types.map(subType => TYPE_DEFINITION[subType])
          .map(
            subType =>
              ({ value: subType.value as SubType, text: subType.label } as SelectOption<SubType>)
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

  const onTypeChange = (nextType: unknown) => {
    const { subTypeOptions } = getSubTypeMeta(nextType as MainType);
    form.setFieldValue('subType', subTypeOptions ? subTypeOptions[0].value : undefined);
  };

  const renderFormFields = useCallback(
    ({ type }) => {
      const { subTypeOptions, subTypeLabel } = getSubTypeMeta(type);

      return (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
            {/* Field name */}
            <EuiFlexItem>
              <NameParameter />
            </EuiFlexItem>

            {/* Field type */}
            <EuiFlexItem>
              <UseField
                path="type"
                config={typeFieldConfig}
                onChange={onTypeChange}
                component={SelectField}
                componentProps={{
                  euiFieldProps: {
                    options: isMultiField
                      ? filterTypesForMultiField(FIELD_TYPES_OPTIONS)
                      : FIELD_TYPES_OPTIONS,
                    'data-test-subj': 'fieldTypeSelect',
                  },
                }}
              />
            </EuiFlexItem>

            {/* Field sub type (if any) */}
            {subTypeOptions && (
              <EuiFlexItem grow={false}>
                <UseField
                  path="subType"
                  defaultValue={subTypeOptions[0].value}
                  config={{
                    ...typeFieldConfig,
                    label: subTypeLabel,
                  }}
                  component={SelectField}
                  componentProps={{
                    euiFieldProps: {
                      options: subTypeOptions,
                      hasNoInitialSelection: false,
                    },
                  }}
                />
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
            {i18n.translate('xpack.idxMgmt.mappingsEditor.createFieldCancelButtonLabel', {
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
          {i18n.translate('xpack.idxMgmt.mappingsEditor.createFieldAddButtonLabel', {
            defaultMessage: 'Add',
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
              {isMultiField && (
                <EuiFlexItem grow={false} className="mappingsEditor__createFieldContent__icon">
                  <EuiIcon type="link" />
                </EuiFlexItem>
              )}
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
