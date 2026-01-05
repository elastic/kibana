/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiTitle,
  EuiButton,
  EuiFormRow,
  EuiComboBox,
  EuiForm,
  EuiLink,
  useGeneratedHtmlId,
  EuiFlyout,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { isSchema, recursiveRecord, Streams } from '@kbn/streams-schema';
import type { SubmitHandler } from 'react-hook-form';
import { FormProvider, useController, useForm, useFormContext, useWatch } from 'react-hook-form';
import { CodeEditor } from '@kbn/code-editor';
import { FormattedMessage } from '@kbn/i18n-react';
import { mapKeys } from 'lodash';
import { prefixOTelField } from '@kbn/otel-semantic-conventions';
import { useBoolean } from '@kbn/react-hooks';
import type { FieldMetadata } from '@kbn/fields-metadata-plugin/common/fields_metadata/models/field_metadata';
import { useKibana } from '../../../../hooks/use_kibana';
import type { MappedSchemaField, SchemaField } from '../types';
import { useSchemaEditorContext } from '../schema_editor_context';
import { FieldTypeSelector as FieldTypeSelectorComponent } from './field_form_type';
import { FieldFormFormat, typeSupportsFormat } from './field_form_format';
import { deserializeJson, serializeXJson } from '../../stream_detail_enrichment/helpers';

export interface AddFieldFlyoutProps {
  onClose: () => void;
  onAddField: (field: SchemaField) => void;
}

export const AddFieldButton = ({ onAddField }: Pick<AddFieldFlyoutProps, 'onAddField'>) => {
  const [isFlyoutVisible, { on: openFlyout, off: closeFlyout }] = useBoolean(false);

  return (
    <>
      <EuiButton
        data-test-subj="streamsAppContentAddFieldButton"
        iconType="plus"
        onClick={openFlyout}
        fill
      >
        {i18n.translate('xpack.streams.schemaEditor.addFieldButtonLabel', {
          defaultMessage: 'Add field',
        })}
      </EuiButton>
      {isFlyoutVisible && <AddFieldFlyout onClose={closeFlyout} onAddField={onAddField} />}
    </>
  );
};

export const AddFieldFlyout = ({ onAddField, onClose }: AddFieldFlyoutProps) => {
  const { stream } = useSchemaEditorContext();

  const flyoutId = useGeneratedHtmlId({ prefix: 'streams-add-field' });

  const methods = useForm<SchemaField>({
    defaultValues: {
      status: 'mapped',
      name: '',
      type: undefined,
      parent: stream.name,
      additionalParameters: {},
    },
    mode: 'onChange',
  });

  const type = useWatch({ control: methods.control, name: 'type' });

  const handleSubmit: SubmitHandler<SchemaField> = (data) => {
    onAddField(data);
    onClose();
  };

  return (
    <EuiFlyout ownFocus onClose={onClose} aria-labelledby={flyoutId} maxWidth={500}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {i18n.translate('xpack.streams.schemaEditor.addFieldFlyout.title', {
              defaultMessage: 'New field',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <FormProvider {...methods}>
          <EuiForm component="form" fullWidth onSubmit={methods.handleSubmit(handleSubmit)}>
            <FieldNameSelector />
            <FieldTypeSelector />
            {typeSupportsFormat(type) && <FieldFormatSelector />}
            <AdvancedFieldMappingEditor />
          </EuiForm>
        </FormProvider>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiButtonEmpty
            data-test-subj="streamsAppSchemaEditorAddFieldFlyoutCloseButton"
            iconType="cross"
            onClick={onClose}
            flush="left"
          >
            {i18n.translate('xpack.streams.schemaEditor.addFieldFlyout.closeButtonLabel', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>
          <EuiButton
            data-test-subj="streamsAppSchemaEditorAddFieldButton"
            onClick={methods.handleSubmit(handleSubmit)}
            isDisabled={methods.formState.isSubmitted && !methods.formState.isValid}
          >
            {i18n.translate('xpack.streams.schemaEditor.addFieldFlyout.addButtonLabel', {
              defaultMessage: 'Add field',
            })}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

export const FieldNameSelector = () => {
  const { useFieldsMetadata } = useKibana().dependencies.start.fieldsMetadata;

  const { fields, stream } = useSchemaEditorContext();

  const { setValue } = useFormContext<SchemaField>();

  const { fieldsMetadata: rawFieldsMetadata } = useFieldsMetadata({
    attributes: ['ignore_above', 'type', 'otel_equivalent'],
    source: ['ecs', 'otel'],
  });

  const { field, fieldState } = useController<SchemaField, 'name'>({
    name: 'name',
    rules: {
      required: i18n.translate('xpack.streams.schemaEditor.addFieldFlyout.fieldNameRequiredError', {
        defaultMessage: 'A field name is required.',
      }),
      validate: (name) => {
        if (fields.some((f) => f.name === name)) {
          return i18n.translate(
            'xpack.streams.schemaEditor.addFieldFlyout.fieldNameAlreadyExistsError',
            { defaultMessage: 'A field with this name already exists.' }
          );
        }
        return true;
      },
    },
  });

  // Map the fields metadata to the OTel equivalent if the stream is a wired stream
  const fieldsMetadata = useMemo(
    () =>
      Streams.WiredStream.Definition.is(stream)
        ? mapKeys(rawFieldsMetadata, (value, key) => value.otel_equivalent ?? prefixOTelField(key))
        : rawFieldsMetadata,
    [rawFieldsMetadata, stream]
  );

  const suggestions = useMemo(() => {
    if (!fieldsMetadata) return [];

    const fieldNamesSet = new Set(fields.map((f) => f.name));

    return Object.keys(fieldsMetadata)
      .filter((name) => !fieldNamesSet.has(name))
      .map((label) => ({ label }));
  }, [fieldsMetadata, fields]);

  const selectedOptions = useMemo(() => {
    if (!field.value) return [];

    const matchingSuggestion = suggestions.find((suggestion) => suggestion.label === field.value);
    return matchingSuggestion ? [matchingSuggestion] : [{ label: field.value }];
  }, [field.value, suggestions]);

  const handleSelectionChange = (newSelectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
    const selectedOption = newSelectedOptions[0];
    const newFieldValue = selectedOption?.label ?? '';
    field.onChange(newFieldValue);

    const fieldMetadata = fieldsMetadata?.[newFieldValue] as FieldMetadata | undefined;
    if (fieldMetadata?.type) {
      setValue('type', fieldMetadata.type as MappedSchemaField['type']);
    }
    if (fieldMetadata?.ignore_above) {
      setValue('additionalParameters', { ignore_above: fieldMetadata.ignore_above });
    } else {
      setValue('additionalParameters', {});
    }
  };

  const handleCreateOption = (searchValue: string) => {
    const normalizedValue = searchValue.trim();
    if (normalizedValue) {
      handleSelectionChange([{ label: normalizedValue }]);
    }
  };

  return (
    <EuiFormRow
      label={i18n.translate('xpack.streams.fieldSelector.defaultLabel', {
        defaultMessage: 'Field name',
      })}
      helpText={i18n.translate('xpack.streams.schemaEditor.addFieldFlyout.fieldTypeHelpText', {
        defaultMessage: 'We suggest naming conventions like ECS or OTel.',
      })}
      isInvalid={fieldState.invalid}
      error={fieldState.error?.message}
      fullWidth
    >
      <EuiComboBox
        data-test-subj="streamsAppSchemaEditorAddFieldFlyoutFieldName"
        placeholder={i18n.translate(
          'xpack.streams.schemaEditor.addFieldFlyout.fieldNamePlaceholder',
          { defaultMessage: 'Select or type a field name...' }
        )}
        options={suggestions}
        selectedOptions={selectedOptions}
        onChange={handleSelectionChange}
        onCreateOption={handleCreateOption}
        singleSelection={{ asPlainText: true }}
        isInvalid={fieldState.invalid}
        isClearable
        fullWidth
        customOptionText={i18n.translate('xpack.streams.fieldSelector.customOptionText', {
          defaultMessage: 'Add {searchValue} as a custom field',
          values: { searchValue: '{searchValue}' },
        })}
      />
    </EuiFormRow>
  );
};

export const FieldTypeSelector = () => {
  const { stream } = useSchemaEditorContext();
  const { field, fieldState } = useController<SchemaField, 'type'>({
    name: 'type',
    rules: {
      required: i18n.translate('xpack.streams.schemaEditor.addFieldFlyout.fieldNameRequiredError', {
        defaultMessage: 'A field type is required.',
      }),
    },
  });

  const streamType = Streams.WiredStream.Definition.is(stream) ? 'wired' : 'classic';

  return (
    <EuiFormRow
      label={i18n.translate('xpack.streams.schemaEditor.addFieldFlyout.fieldTypeLabel', {
        defaultMessage: 'Field type',
      })}
      helpText={i18n.translate('xpack.streams.schemaEditor.addFieldFlyout.fieldTypeHelpText', {
        defaultMessage: 'We prefill the field type when matching an ECS or OTel field name.',
      })}
      fullWidth
      isInvalid={fieldState.invalid}
      error={fieldState.error?.message}
    >
      <FieldTypeSelectorComponent
        value={field.value}
        onChange={field.onChange}
        streamType={streamType}
      />
    </EuiFormRow>
  );
};

export const FieldFormatSelector = () => {
  const { field } = useController<SchemaField, 'format'>({ name: 'format' });

  return (
    <EuiFormRow
      label={i18n.translate('xpack.streams.schemaEditor.addFieldFlyout.fieldFormatSelector.label', {
        defaultMessage: 'Field format',
      })}
      fullWidth
    >
      <FieldFormFormat onChange={field.onChange} value={field.value} />
    </EuiFormRow>
  );
};

export const AdvancedFieldMappingEditor = () => {
  const { core } = useKibana();

  const { field, fieldState } = useController<SchemaField, 'additionalParameters'>({
    name: 'additionalParameters',
    rules: {
      validate: (value) => {
        const isValid = Boolean(!value || value === '' || isSchema(recursiveRecord, value));
        if (!isValid) {
          return i18n.translate(
            'xpack.streams.schemaEditor.addFieldFlyout.advancedFieldMappingOptions.error',
            {
              defaultMessage:
                'Invalid advanced field mapping parameters. It should be defined as a JSON object.',
            }
          );
        }
        return true;
      },
    },
  });

  /**
   * To have the editor properly handle the set xjson language
   * we need to avoid the continuous parsing/serialization of the editor value
   * using a parallel state always setting a string make the editor format well the content.
   */
  const serializedValue = useMemo(() => serializeXJson(field.value), [field.value]);
  const [value, setValue] = React.useState(serializedValue);
  // Sync internal state for editor with the form value controlled by the form
  if (value !== serializedValue) {
    setValue(serializedValue);
  }

  const handleChange = (newValue: string) => {
    setValue(newValue);
    field.onChange(deserializeJson(newValue));
  };

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.schemaEditor.addFieldFlyout.advancedFieldMappingOptions.label',
        { defaultMessage: 'Advanced field mapping parameters' }
      )}
      helpText={
        <FormattedMessage
          id="xpack.streams.schemaEditor.addFieldFlyout.advancedFieldMappingOptions.docs.label"
          defaultMessage="Parameters can be defined with JSON. {link}"
          values={{
            link: (
              <EuiLink
                data-test-subj="streamsAppAdvancedFieldMappingOptionsViewDocumentationLink"
                href={core.docLinks.links.elasticsearch.mappingParameters}
                target="_blank"
                external
              >
                <FormattedMessage
                  id="xpack.streams.indexPattern.randomSampling.learnMore"
                  defaultMessage="View documentation."
                />
              </EuiLink>
            ),
          }}
        />
      }
      fullWidth
      isInvalid={fieldState.invalid}
      error={fieldState.error?.message}
    >
      <CodeEditor
        height={120}
        languageId="xjson"
        value={value}
        onChange={handleChange}
        options={{
          automaticLayout: true,
        }}
      />
    </EuiFormRow>
  );
};
