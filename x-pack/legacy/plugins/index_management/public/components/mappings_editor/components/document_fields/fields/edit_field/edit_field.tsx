/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCode,
  EuiSpacer,
} from '@elastic/eui';

import { useForm, Form } from '../../../../shared_imports';
import { useDispatch } from '../../../../mappings_state';
import { Field, NormalizedField } from '../../../../types';
import { fieldSerializer, fieldDeserializer } from '../../../../lib';
import { UpdateFieldProvider, UpdateFieldFunc } from './update_field_provider';
import { EditFieldHeaderForm } from './edit_field_header_form';
import { EditFieldSection } from './edit_field_section';

const formWrapper = (props: any) => <form {...props} />;

interface Props {
  field: NormalizedField;
}

export const EditField = React.memo(({ field }: Props) => {
  const { form } = useForm<Field>({
    defaultValue: { ...field.source },
    serializer: fieldSerializer,
    deserializer: fieldDeserializer,
  });
  const dispatch = useDispatch();

  const getSubmitForm = (updateField: UpdateFieldFunc) => async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    const { isValid, data } = await form.submit();

    if (isValid) {
      updateField({ ...field, source: data });
    }
  };

  useEffect(() => {
    const subscription = form.subscribe(updatedFieldForm => {
      dispatch({ type: 'fieldForm.update', value: updatedFieldForm });
    });

    return subscription.unsubscribe;
  }, [form]);

  const exitEdit = () => {
    dispatch({ type: 'documentField.changeStatus', value: 'idle' });
  };

  const cancel = () => {
    exitEdit();
  };

  const { isMultiField } = field;

  return (
    <UpdateFieldProvider>
      {updateField => (
        <EuiFlyout
          data-test-subj="mappingsEditorFieldEdit"
          onClose={exitEdit}
          aria-labelledby="mappingsEditorFieldEditTitle"
          size="m"
          maxWidth={720}
        >
          <EuiFlyoutHeader>
            <EuiTitle size="m">
              <h2>Edit field '{field.source.name}'</h2>
            </EuiTitle>
            <EuiCode>{field.path}</EuiCode>
          </EuiFlyoutHeader>

          <EuiFlyoutBody>
            <Form
              form={form}
              style={{ padding: '20px 0' }}
              FormWrapper={formWrapper}
              onSubmit={getSubmitForm(updateField)}
            >
              <EditFieldSection title="Field definition">
                <EditFieldHeaderForm defaultValue={field.source} isMultiField={isMultiField} />
              </EditFieldSection>

              <EditFieldSection>
                <p>Here will come the form for the parameters....</p>
              </EditFieldSection>
            </Form>
          </EuiFlyoutBody>

          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={cancel}>Cancel</EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton fill onClick={getSubmitForm(updateField)} type="submit">
                  Update
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}
    </UpdateFieldProvider>
  );
});
