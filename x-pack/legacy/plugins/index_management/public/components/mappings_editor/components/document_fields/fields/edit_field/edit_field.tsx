/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useRef, useEffect } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { useForm, Form, ValidationFunc, OnFormUpdateArg } from '../../../../shared_imports';
import { OnUpdateHandler } from '../../../../../json_editor';
import { useDispatch } from '../../../../mappings_state';
import { Field, NormalizedField } from '../../../../types';
import { UpdateFieldProvider, UpdateFieldFunc } from './update_field_provider';
import { EditFieldHeaderForm } from './edit_field_header_form';
import { FieldSettingsJsonEditor } from './field_settings_json_editor';

const formWrapper = (props: any) => <form {...props} />;

interface Props {
  field: NormalizedField;
  uniqueNameValidator: ValidationFunc;
}

export const EditField = React.memo(({ field, uniqueNameValidator }: Props) => {
  const { form } = useForm<Field>({ defaultValue: field.source });
  const dispatch = useDispatch();

  const fieldsSettings = useRef<Parameters<OnUpdateHandler>[0] | undefined>(undefined);
  const fieldFormUpdate = useRef<OnFormUpdateArg<Field> | undefined>(undefined);

  const getSubmitForm = (updateField: UpdateFieldFunc) => async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    const { isValid: isFormValid, data: formData } = await form.submit();

    const {
      isValid: isFieldsSettingsValid,
      data: { format: getFieldsSettingsData },
    } = fieldsSettings.current!;

    if (isFormValid && isFieldsSettingsValid) {
      const fieldsSettingsData = getFieldsSettingsData();
      updateField({ ...field, source: { ...formData, ...fieldsSettingsData } });
    }
  };

  const getUpdatedField = (): OnFormUpdateArg<Field> | void => {
    if (fieldFormUpdate.current === undefined || fieldsSettings.current === undefined) {
      return;
    }

    const isFormValid = fieldFormUpdate.current.isValid;
    const isFieldsSettingsValid = fieldsSettings.current.isValid;

    return {
      isValid: isFormValid === undefined ? undefined : isFormValid && isFieldsSettingsValid,
      data: {
        raw: { ...fieldFormUpdate.current.data.raw, settings: fieldsSettings.current.data.raw },
        format() {
          return {
            ...fieldFormUpdate.current!.data.format(),
            ...fieldsSettings.current!.data.format(),
          };
        },
      },
      validate: async () => {
        const isFieldFormValid = await fieldFormUpdate.current!.validate();
        return isFieldFormValid && fieldsSettings.current!.isValid;
      },
    };
  };

  useEffect(() => {
    const subscription = form.subscribe(updatedFieldForm => {
      fieldFormUpdate.current = updatedFieldForm;

      const updatedField = getUpdatedField();
      if (updatedField) {
        dispatch({ type: 'fieldForm.update', value: updatedField });
      }
    });

    return subscription.unsubscribe;
  }, [form]);

  const onFieldsSettingsUpdate: OnUpdateHandler = fieldsSettingsUpdate => {
    fieldsSettings.current = fieldsSettingsUpdate;

    const updatedField = getUpdatedField();
    if (updatedField) {
      dispatch({ type: 'fieldForm.update', value: updatedField });
    }
  };

  const exitEdit = () => {
    dispatch({ type: 'documentField.changeStatus', value: 'idle' });
  };

  const cancel = () => {
    exitEdit();
  };

  const {
    source: { name, type, ...fieldsSettingsDefault },
  } = field;

  return (
    <UpdateFieldProvider>
      {updateField => (
        <EuiFlyout
          data-test-subj="mappingsEditorFieldEdit"
          onClose={exitEdit}
          aria-labelledby="mappingsEditorFieldEditTitle"
          size="m"
          maxWidth={400}
        >
          <EuiFlyoutHeader>
            <EuiTitle size="m">
              <h2>Edit field '{field.source.name}'</h2>
            </EuiTitle>
          </EuiFlyoutHeader>

          <EuiFlyoutBody>
            <Form
              form={form}
              style={{ padding: '20px 0' }}
              FormWrapper={formWrapper}
              onSubmit={getSubmitForm(updateField)}
            >
              <EditFieldHeaderForm uniqueNameValidator={uniqueNameValidator} />
            </Form>
            <FieldSettingsJsonEditor
              onUpdate={onFieldsSettingsUpdate}
              defaultValue={fieldsSettingsDefault}
            />
          </EuiFlyoutBody>

          <EuiFlyoutFooter>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiButton onClick={getSubmitForm(updateField)} type="submit">
                  Update
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButton onClick={cancel}>Cancel</EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}
    </UpdateFieldProvider>
  );
});
