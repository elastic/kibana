/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect } from 'react';
import classNames from 'classnames';

import {
  EuiButtonEmpty,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiOutsideClickDetector,
  EuiIcon,
} from '@elastic/eui';

import { useForm, Form, FormDataProvider, SelectField, UseField } from '../../../shared_imports';

import { TYPE_DEFINITION, FIELD_TYPES_OPTIONS, EUI_SIZE } from '../../../constants';

import { useDispatch } from '../../../mappings_state';
import { fieldSerializer, getFieldConfig, filterTypesForMultiField } from '../../../lib';
import { Field, MainType } from '../../../types';
import { NameParameter } from '../field_parameters';

const formWrapper = (props: any) => <form {...props} />;

interface Props {
  isMultiField?: boolean;
  paddingLeft?: number;
  isCancelable?: boolean;
  maxNestedDepth?: number;
}

export const CreateField = React.memo(function CreateFieldComponent({
  isMultiField,
  paddingLeft,
  isCancelable,
  maxNestedDepth,
}: Props) {
  const { form } = useForm<Field>({ serializer: fieldSerializer });
  const dispatch = useDispatch();

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

  const renderFormFields = (type: MainType) => {
    const typeDefinition = TYPE_DEFINITION[type];
    const hasSubType = typeDefinition && typeDefinition.subTypes !== undefined;

    const subTypeOptions =
      typeDefinition && typeDefinition.subTypes
        ? typeDefinition.subTypes.types
            .map(subType => TYPE_DEFINITION[subType])
            .map(subType => ({ value: subType.value, text: subType.label }))
        : undefined;

    return (
      <EuiFlexGroup gutterSize="s">
        {/* Field name */}
        <EuiFlexItem>
          <NameParameter />
        </EuiFlexItem>

        {/* Field type */}
        <EuiFlexItem>
          <UseField
            path="type"
            config={getFieldConfig('type')}
            component={SelectField}
            componentProps={{
              euiFieldProps: {
                options: isMultiField
                  ? filterTypesForMultiField(FIELD_TYPES_OPTIONS)
                  : FIELD_TYPES_OPTIONS,
              },
            }}
          />
        </EuiFlexItem>

        {/* Field sub type (if any) */}
        {hasSubType && (
          <EuiFlexItem grow={false}>
            <UseField
              path="subType"
              defaultValue={typeDefinition.subTypes!.types[0]}
              config={{
                ...getFieldConfig('type'),
                label: typeDefinition.subTypes!.label,
              }}
              component={SelectField}
              componentProps={{
                euiFieldProps: {
                  options: isMultiField
                    ? filterTypesForMultiField(subTypeOptions!)
                    : subTypeOptions,
                  hasNoInitialSelection: false,
                },
              }}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  };

  const renderFormActions = () => (
    <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
      {isCancelable !== false && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={cancel}>Cancel</EuiButtonEmpty>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiButton color="primary" fill onClick={submitForm} type="submit">
          Add
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <EuiOutsideClickDetector onOutsideClick={onClickOutside}>
      <Form form={form} FormWrapper={formWrapper} onSubmit={submitForm}>
        <div
          className={classNames('mappings-editor__create-field-wrapper', {
            'mappings-editor__create-field-wrapper--toggle':
              Boolean(maxNestedDepth) && maxNestedDepth! > 0,
            'mappings-editor__create-field-wrapper--multi-field': isMultiField,
          })}
          style={{
            paddingLeft: `${
              isMultiField
                ? paddingLeft! - EUI_SIZE * 1.5 // As there are no "L" bullet list we need to substract some indent
                : paddingLeft
            }px`,
          }}
        >
          <div className="mappings-editor__create-field-content">
            <EuiFlexGroup gutterSize="s" alignItems="center">
              {isMultiField && (
                <EuiFlexItem grow={false} className="mappings-editor__create-field-content__icon">
                  <EuiIcon type="link" />
                </EuiFlexItem>
              )}
              <FormDataProvider pathsToWatch="type">
                {({ type }) => {
                  return <EuiFlexItem grow={false}>{renderFormFields(type)}</EuiFlexItem>;
                }}
              </FormDataProvider>
              <EuiFlexItem>{renderFormActions()}</EuiFlexItem>
            </EuiFlexGroup>
          </div>
        </div>
      </Form>
    </EuiOutsideClickDetector>
  );
});
