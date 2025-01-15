/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { PainlessLang, PainlessContext } from '@kbn/monaco';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiFormRow,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiLink,
  EuiCallOut,
  EuiCode,
} from '@elastic/eui';

import {
  useForm,
  useFormData,
  Form,
  FormHook,
  UseField,
  TextField,
  CodeEditor,
  ValidationFunc,
  FieldConfig,
} from '../../shared_imports';
import { RuntimeField, RuntimeType } from '../../types';
import { RUNTIME_FIELD_OPTIONS } from '../../constants';
import { schema } from './schema';

export interface FormState {
  isValid: boolean | undefined;
  isSubmitted: boolean;
  submit: FormHook<RuntimeField>['submit'];
}

interface Field {
  name: string;
  type: string;
}

export interface Props {
  links: {
    runtimePainless: string;
  };
  defaultValue?: RuntimeField;
  onChange?: (state: FormState) => void;
  /**
   * Optional context object
   */
  ctx?: {
    /** An array of field name not allowed */
    namesNotAllowed?: string[];
    /**
     * An array of existing concrete fields. If the user gives a name to the runtime
     * field that matches one of the concrete fields, a callout will be displayed
     * to indicate that this runtime field will shadow the concrete field.
     * It is also used to provide the list of field autocomplete suggestions to the code editor.
     */
    existingConcreteFields?: Field[];
  };
}

const createNameNotAllowedValidator =
  (namesNotAllowed: string[]): ValidationFunc<{}, string, string> =>
  ({ value }) => {
    if (namesNotAllowed.includes(value)) {
      return {
        message: i18n.translate(
          'xpack.runtimeFields.runtimeFieldsEditor.existRuntimeFieldNamesValidationErrorMessage',
          {
            defaultMessage: 'There is already a field with this name.',
          }
        ),
      };
    }
  };

/**
 * Dynamically retrieve the config for the "name" field, adding
 * a validator to avoid duplicated runtime fields to be created.
 *
 * @param namesNotAllowed Array of names not allowed for the field "name"
 * @param defaultValue Initial value of the form
 */
const getNameFieldConfig = (
  namesNotAllowed?: string[],
  defaultValue?: Props['defaultValue']
): FieldConfig<string, RuntimeField> => {
  const nameFieldConfig = schema.name as FieldConfig<string, RuntimeField>;

  if (!namesNotAllowed) {
    return nameFieldConfig;
  }

  // Add validation to not allow duplicates
  return {
    ...nameFieldConfig!,
    validations: [
      ...(nameFieldConfig.validations ?? []),
      {
        validator: createNameNotAllowedValidator(
          namesNotAllowed.filter((name) => name !== defaultValue?.name)
        ),
      },
    ],
  };
};

const mapReturnTypeToPainlessContext = (runtimeType: RuntimeType): PainlessContext => {
  switch (runtimeType) {
    case 'keyword':
      return 'string_script_field_script_field';
    case 'long':
      return 'long_script_field_script_field';
    case 'double':
      return 'double_script_field_script_field';
    case 'date':
      return 'date_script_field';
    case 'ip':
      return 'ip_script_field_script_field';
    case 'boolean':
      return 'boolean_script_field_script_field';
    default:
      return 'string_script_field_script_field';
  }
};

const RuntimeFieldFormComp = ({
  defaultValue,
  onChange,
  links,
  ctx: { namesNotAllowed, existingConcreteFields = [] } = {},
}: Props) => {
  const typeFieldConfig = schema.type as FieldConfig<RuntimeType, RuntimeField>;

  const [painlessContext, setPainlessContext] = useState<PainlessContext>(
    mapReturnTypeToPainlessContext(typeFieldConfig!.defaultValue!)
  );
  const { form } = useForm<RuntimeField>({ defaultValue, schema });
  const { submit, isValid: isFormValid, isSubmitted } = form;
  const [{ name }] = useFormData<RuntimeField>({ form, watch: 'name' });

  const nameFieldConfig = getNameFieldConfig(namesNotAllowed, defaultValue);

  const onTypeChange = useCallback((newType: Array<EuiComboBoxOptionOption<RuntimeType>>) => {
    setPainlessContext(mapReturnTypeToPainlessContext(newType[0]!.value!));
  }, []);

  const suggestionProvider = PainlessLang.getSuggestionProvider(
    painlessContext,
    existingConcreteFields
  );

  useEffect(() => {
    if (onChange) {
      onChange({ isValid: isFormValid, isSubmitted, submit });
    }
  }, [onChange, isFormValid, isSubmitted, submit]);

  return (
    <Form form={form} className="runtimeFieldEditor_form">
      <EuiFlexGroup>
        {/* Name */}
        <EuiFlexItem>
          <UseField<string, RuntimeField>
            path="name"
            config={nameFieldConfig}
            component={TextField}
            data-test-subj="nameField"
            componentProps={{
              euiFieldProps: {
                'aria-label': i18n.translate('xpack.runtimeFields.form.nameAriaLabel', {
                  defaultMessage: 'Name field',
                }),
              },
            }}
          />
        </EuiFlexItem>

        {/* Return type */}
        <EuiFlexItem>
          <UseField<Array<EuiComboBoxOptionOption<RuntimeType>>>
            path="type"
            onChange={onTypeChange}
          >
            {({ label, value, setValue }) => {
              if (value === undefined) {
                return null;
              }
              return (
                <>
                  <EuiFormRow label={label} fullWidth>
                    <EuiComboBox
                      placeholder={i18n.translate(
                        'xpack.runtimeFields.form.runtimeType.placeholderLabel',
                        {
                          defaultMessage: 'Select a type',
                        }
                      )}
                      singleSelection={{ asPlainText: true }}
                      options={RUNTIME_FIELD_OPTIONS}
                      selectedOptions={value}
                      onChange={(newValue) => {
                        if (newValue.length === 0) {
                          // Don't allow clearing the type. One must always be selected
                          return;
                        }
                        setValue(newValue);
                      }}
                      isClearable={false}
                      data-test-subj="typeField"
                      aria-label={i18n.translate('xpack.runtimeFields.form.typeSelectAriaLabel', {
                        defaultMessage: 'Type select',
                      })}
                      fullWidth
                    />
                  </EuiFormRow>
                </>
              );
            }}
          </UseField>
        </EuiFlexItem>
      </EuiFlexGroup>

      {existingConcreteFields.find((field) => field.name === name) && (
        <>
          <EuiSpacer />
          <EuiCallOut
            title={i18n.translate('xpack.runtimeFields.form.fieldShadowingCalloutTitle', {
              defaultMessage: 'Field shadowing',
            })}
            color="warning"
            iconType="pin"
            size="s"
            data-test-subj="shadowingFieldCallout"
          >
            <div>
              {i18n.translate('xpack.runtimeFields.form.fieldShadowingCalloutDescription', {
                defaultMessage:
                  'This field shares the name of a mapped field. Values for this field will be returned in search results.',
              })}
            </div>
          </EuiCallOut>
        </>
      )}

      <EuiSpacer size="l" />

      {/* Script */}
      <UseField<string> path="script.source">
        {({ value, setValue, label, isValid, getErrorsMessages }) => {
          return (
            <EuiFormRow
              label={label}
              error={getErrorsMessages()}
              isInvalid={!isValid}
              helpText={
                <FormattedMessage
                  id="xpack.runtimeFields.form.source.scriptFieldHelpText"
                  defaultMessage="Runtime fields without a script retrieve values from a field with the same name in {source}. If a field with the same name doesn’t exist, no values return when a search request includes the runtime field. {learnMoreLink}"
                  values={{
                    learnMoreLink: (
                      <EuiLink
                        href={links.runtimePainless}
                        target="_blank"
                        external
                        data-test-subj="painlessSyntaxLearnMoreLink"
                      >
                        {i18n.translate('xpack.runtimeFields.form.script.learnMoreLinkText', {
                          defaultMessage: 'Learn about script syntax.',
                        })}
                      </EuiLink>
                    ),
                    source: <EuiCode>{'_source'}</EuiCode>,
                  }}
                />
              }
              fullWidth
            >
              <CodeEditor
                languageId={PainlessLang.ID}
                suggestionProvider={suggestionProvider}
                width="100%"
                height="300px"
                value={value}
                onChange={setValue}
                options={{
                  fontSize: 12,
                  minimap: {
                    enabled: false,
                  },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  wrappingIndent: 'indent',
                  automaticLayout: true,
                  suggest: {
                    snippetsPreventQuickSuggestions: false,
                  },
                }}
                data-test-subj="scriptField"
                aria-label={i18n.translate('xpack.runtimeFields.form.scriptEditorAriaLabel', {
                  defaultMessage: 'Script editor',
                })}
              />
            </EuiFormRow>
          );
        }}
      </UseField>
    </Form>
  );
};

export const RuntimeFieldForm = React.memo(RuntimeFieldFormComp);
