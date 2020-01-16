/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
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
  EuiSpacer,
  EuiCallOut,
} from '@elastic/eui';

import { documentationService } from '../../../../../../services/documentation';
import { Form, FormHook, FormDataProvider } from '../../../../shared_imports';
import { TYPE_DEFINITION } from '../../../../constants';
import { Field, NormalizedField, NormalizedFields, MainType, SubType } from '../../../../types';
import { CodeBlock } from '../../../code_block';
import { getParametersFormForType } from '../field_types';
import { UpdateFieldProvider, UpdateFieldFunc } from './update_field_provider';
import { EditFieldHeaderForm } from './edit_field_header_form';

const limitStringLength = (text: string, limit = 18): string => {
  if (text.length <= limit) {
    return text;
  }

  return `...${text.substr(limit * -1)}`;
};

interface Props {
  form: FormHook<Field>;
  field: NormalizedField;
  allFields: NormalizedFields['byId'];
  exitEdit(): void;
}

export const EditField = React.memo(({ form, field, allFields, exitEdit }: Props) => {
  const getSubmitForm = (updateField: UpdateFieldFunc) => async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    const { isValid, data } = await form.submit();

    if (isValid) {
      updateField({ ...field, source: data });
    }
  };

  const cancel = () => {
    exitEdit();
  };

  const { isMultiField } = field;

  return (
    <UpdateFieldProvider>
      {updateField => (
        <Form form={form} onSubmit={getSubmitForm(updateField)}>
          <FormDataProvider pathsToWatch={['type', 'subType']}>
            {({ type, subType }) => {
              const typeDefinition = TYPE_DEFINITION[type as MainType];
              const subTypeDefinition = TYPE_DEFINITION[subType as SubType];
              const ParametersForm = getParametersFormForType(type, subType);

              if (typeDefinition === undefined) {
                return null;
              }

              const linkDocumentation =
                documentationService.getTypeDocLink(subType) ||
                documentationService.getTypeDocLink(type);

              return (
                <EuiFlyout
                  data-test-subj="mappingsEditorFieldEdit"
                  onClose={exitEdit}
                  aria-labelledby="mappingsEditorFieldEditTitle"
                  size="m"
                  className="mappingsEditor__editField"
                  maxWidth={720}
                >
                  <EuiFlyoutHeader>
                    <EuiFlexGroup gutterSize="xs">
                      <EuiFlexItem>
                        {/* We need an extra div to get out of flex grow */}
                        <div>
                          {/* Title */}
                          <EuiTitle size="m">
                            <h2>
                              {isMultiField
                                ? i18n.translate(
                                    'xpack.idxMgmt.mappingsEditor.editMultiFieldTitle',
                                    {
                                      defaultMessage: "Edit multi-field '{fieldName}'",
                                      values: {
                                        fieldName: limitStringLength(field.source.name),
                                      },
                                    }
                                  )
                                : i18n.translate('xpack.idxMgmt.mappingsEditor.editFieldTitle', {
                                    defaultMessage: "Edit field '{fieldName}'",
                                    values: {
                                      fieldName: limitStringLength(field.source.name),
                                    },
                                  })}
                            </h2>
                          </EuiTitle>
                        </div>
                      </EuiFlexItem>

                      {/* Documentation link */}
                      <EuiFlexItem grow={false}>
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
                      </EuiFlexItem>
                    </EuiFlexGroup>

                    {/* Field path */}
                    <EuiFlexGroup>
                      <EuiFlexItem grow={false}>
                        <CodeBlock padding="small">{field.path.join(' > ')}</CodeBlock>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlyoutHeader>

                  <EuiFlyoutBody>
                    <EditFieldHeaderForm
                      type={type}
                      defaultValue={field.source}
                      isRootLevelField={field.parentId === undefined}
                      isMultiField={isMultiField}
                    />

                    {ParametersForm && (
                      <ParametersForm
                        // As the component "ParametersForm" does not change when switching type, and all the props
                        // also remain the same (===), adding a key give us *a new instance* each time we change the type or subType.
                        // This will trigger an unmount of all the previous form fields and then mount the new ones.
                        key={subType ?? type}
                        field={field}
                        allFields={allFields}
                        isMultiField={isMultiField}
                      />
                    )}
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
                        <EuiButtonEmpty onClick={cancel}>
                          {i18n.translate(
                            'xpack.idxMgmt.mappingsEditor.editFieldCancelButtonLabel',
                            {
                              defaultMessage: 'Cancel',
                            }
                          )}
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButton
                          fill
                          onClick={getSubmitForm(updateField)}
                          type="submit"
                          disabled={form.isSubmitted && !form.isValid}
                          data-test-subj="editFieldUpdateButton"
                        >
                          {i18n.translate(
                            'xpack.idxMgmt.mappingsEditor.editFieldUpdateButtonLabel',
                            {
                              defaultMessage: 'Update',
                            }
                          )}
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
