/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect } from 'react';
import {
  EuiButtonEmpty,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiOutsideClickDetector,
} from '@elastic/eui';

import {
  useForm,
  Form,
  FormDataProvider,
  SelectField,
  UseField,
  FieldConfig,
} from '../../../shared_imports';

import {
  DATA_TYPE_DEFINITION,
  FIELD_TYPES_OPTIONS,
  PARAMETERS_DEFINITION,
} from '../../../constants';

import { useDispatch } from '../../../mappings_state';
import { fieldSerializer } from '../../../lib';
import { Field, ParameterName, MainType } from '../../../types';
import { NameParameter } from '../field_parameters';

const formWrapper = (props: any) => <form {...props} />;

const getFieldConfig = (param: ParameterName): FieldConfig =>
  PARAMETERS_DEFINITION[param].fieldConfig || {};

interface Props {
  paddingLeft?: string;
  isCancelable?: boolean;
}

export const CreateField = React.memo(function CreateFieldComponent({
  paddingLeft,
  isCancelable,
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
    const typeDefinition = DATA_TYPE_DEFINITION[type];

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
                options: FIELD_TYPES_OPTIONS,
              },
            }}
          />
        </EuiFlexItem>

        {/* Field sub type (if any) */}
        {typeDefinition && typeDefinition.subTypes && (
          <EuiFlexItem grow={false}>
            <UseField
              path="subType"
              defaultValue={typeDefinition.subTypes.types[0]}
              config={{
                ...getFieldConfig('type'),
                label: typeDefinition.subTypes.label,
              }}
              component={SelectField}
              componentProps={{
                euiFieldProps: {
                  options: typeDefinition.subTypes.types.map(subType => ({
                    value: subType,
                    text: subType,
                  })),
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
    <EuiFlexGroup gutterSize="s">
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
          className="mappings-editor__create-field-wrapper"
          style={{
            paddingLeft,
          }}
        >
          <div className="mappings-editor__create-field-content">
            <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween" alignItems="flexEnd">
              <FormDataProvider pathsToWatch="type">
                {({ type }) => {
                  return <EuiFlexItem grow={false}>{renderFormFields(type)}</EuiFlexItem>;
                }}
              </FormDataProvider>
              <EuiFlexItem grow={false}>{renderFormActions()}</EuiFlexItem>
            </EuiFlexGroup>
          </div>
        </div>
      </Form>
    </EuiOutsideClickDetector>
  );
});
