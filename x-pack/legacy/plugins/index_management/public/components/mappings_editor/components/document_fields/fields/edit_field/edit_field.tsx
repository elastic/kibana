/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
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
  EuiCallOut,
} from '@elastic/eui';

import { useForm, Form, FormDataProvider } from '../../../../shared_imports';
import { useDispatch } from '../../../../mappings_state';
import { TYPE_DEFINITION } from '../../../../constants';
import { Field, NormalizedField, NormalizedFields, MainType, SubType } from '../../../../types';
import { fieldSerializer, fieldDeserializer, getTypeDocLink } from '../../../../lib';
import { getParametersFormForType } from '../field_types';
import { UpdateFieldProvider, UpdateFieldFunc } from './update_field_provider';
import { EditFieldHeaderForm } from './edit_field_header_form';
import { EditFieldSection } from './edit_field_section';

interface Props {
  field: NormalizedField;
  allFields: NormalizedFields['byId'];
}

export const EditField = React.memo(({ field, allFields }: Props) => {
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
        <Form form={form} style={{ padding: '20px 0' }} onSubmit={getSubmitForm(updateField)}>
          <FormDataProvider pathsToWatch={['type', 'subType']}>
            {({ type, subType }) => {
              const typeDefinition = TYPE_DEFINITION[type as MainType];
              const subTypeDefinition = TYPE_DEFINITION[subType as SubType];
              const ParametersForm = getParametersFormForType(type, subType);

              if (typeDefinition === undefined) {
                return null;
              }

              const linkDocumentation = getTypeDocLink(subType) || getTypeDocLink(type);

              return (
                <EuiFlyout
                  data-test-subj="mappingsEditorFieldEdit"
                  onClose={exitEdit}
                  aria-labelledby="mappingsEditorFieldEditTitle"
                  size="m"
                  className="mappings-editor__edit-field"
                  maxWidth={720}
                >
                  <EuiFlyoutHeader>
                    <EuiTitle size="m">
                      <h2>Edit field &apos;{field.source.name}&apos;</h2>
                    </EuiTitle>
                    <EuiCode>{field.path}</EuiCode>
                    <EuiSpacer size="s" />
                    <div>
                      <EuiButtonEmpty
                        size="s"
                        flush="right"
                        href={linkDocumentation}
                        target="_blank"
                        iconType="help"
                      >
                        {i18n.translate(
                          'xpack.idxMgmt.mappingsEditor.editField.typeDocumentation',
                          {
                            defaultMessage: '{type} documentation',
                            values: {
                              type: subTypeDefinition
                                ? subTypeDefinition.label
                                : typeDefinition.label,
                            },
                          }
                        )}
                      </EuiButtonEmpty>
                    </div>
                  </EuiFlyoutHeader>

                  <EuiFlyoutBody>
                    <EditFieldSection title="Field definition">
                      <EditFieldHeaderForm
                        type={type}
                        defaultValue={field.source}
                        isMultiField={isMultiField}
                      />
                    </EditFieldSection>

                    {ParametersForm && <ParametersForm field={field} allFields={allFields} />}
                  </EuiFlyoutBody>

                  <EuiFlyoutFooter>
                    {form.isSubmitted && !form.isValid && (
                      <>
                        <EuiCallOut
                          title={i18n.translate(
                            'xpack.idxMgmt.mappingsEditor.editFieldFlyout.validationErrorTitle',
                            {
                              defaultMessage: 'Fix errors in form before continuing.',
                            }
                          )}
                          color="danger"
                          iconType="cross"
                          data-test-subj="formError"
                        />
                        <EuiSpacer size="m" />
                      </>
                    )}

                    <EuiFlexGroup justifyContent="flexEnd">
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty onClick={cancel}>Cancel</EuiButtonEmpty>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButton
                          fill
                          onClick={getSubmitForm(updateField)}
                          type="submit"
                          disabled={form.isSubmitted && !form.isValid}
                        >
                          Update
                        </EuiButton>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlyoutFooter>
                </EuiFlyout>
              );
            }}
          </FormDataProvider>
        </Form>
      )}
    </UpdateFieldProvider>
  );
});
