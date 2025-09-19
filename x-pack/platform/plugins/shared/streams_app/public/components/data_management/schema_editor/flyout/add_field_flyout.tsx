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
} from '@elastic/eui';
import React, { useCallback, useMemo, useReducer, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { UseFieldsMetadataReturnType } from '@kbn/fields-metadata-plugin/public/hooks/use_fields_metadata';
import { isEmpty } from 'lodash';
import { useKibana } from '../../../../hooks/use_kibana';
import type { MappedSchemaField, SchemaField } from '../types';
import { AdvancedFieldMappingOptions } from './advanced_field_mapping_options';
import { StreamsAppContextProvider } from '../../../streams_app_context_provider';
import { useSchemaEditorContext } from '../schema_editor_context';
import { FieldTypeSelector } from './field_form_type';

export interface AddFieldFlyoutProps {
  onClose: () => void;
  onAddField: (field: SchemaField) => void;
  stream: Streams.ingest.all.Definition;
}

export const AddFieldButton = ({ onAddField }: Pick<AddFieldFlyoutProps, 'onAddField'>) => {
  const context = useKibana();
  const { stream } = useSchemaEditorContext();

  const { core } = context;

  const openFlyout = () => {
    const overlay = core.overlays.openFlyout(
      toMountPoint(
        <StreamsAppContextProvider context={context}>
          <AddFieldFlyout onClose={() => overlay.close()} onAddField={onAddField} stream={stream} />
        </StreamsAppContextProvider>,
        core
      ),
      { maxWidth: 500 }
    );
  };

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
    </>
  );
};

export const AddFieldFlyout = ({ stream, onClose, onAddField }: AddFieldFlyoutProps) => {
  const { useFieldsMetadata } = useKibana().dependencies.start.fieldsMetadata;

  const { fieldsMetadata, loading } = useFieldsMetadata({ attributes: ['ignore_above', 'type'] });

  const [isValidAdvancedFieldMappings, setValidAdvancedFieldMappings] = useState(true);

  const [field, setField] = useReducer(
    (prev: SchemaField, updated: Partial<SchemaField>) =>
      ({
        ...prev,
        ...updated,
      } as SchemaField),
    {
      status: 'unmapped',
      name: '',
      parent: stream.name,
    }
  );

  const hasValidFieldName = !isEmpty(field.name);
  const hasValidFieldType = !isEmpty(field.type);

  return (
    <>
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
        <FieldNameSelector
          value={field.name}
          onChange={(name) => {
            setField({ name });

            const type = fieldsMetadata?.[name]?.type as MappedSchemaField['type'] | undefined;
            if (type) setField({ type });
          }}
          fields={fieldsMetadata}
          // isInvalid={field.name === ''}
          // error={i18n.translate('xpack.streams.schemaEditor.addFieldFlyout.fieldNameError', {
          //   defaultMessage: 'A field name is required.',
          // })}
        />
        <EuiFormRow
          label={i18n.translate('xpack.streams.schemaEditor.addFieldFlyout.fieldTypeLabel', {
            defaultMessage: 'Field type',
          })}
          helpText={i18n.translate('xpack.streams.schemaEditor.addFieldFlyout.fieldTypeHelpText', {
            defaultMessage: 'We prefill the field type when matching an ECS or OTel field name.',
          })}
          fullWidth
        >
          <FieldTypeSelector
            value={field.type}
            onChange={(type) => setField({ type })}
            isLoading={loading}
          />
        </EuiFormRow>
        <AdvancedFieldMappingOptions
          field={field}
          onChange={setField}
          onValidate={setValidAdvancedFieldMappings}
          isEditing
        />
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
            disabled={!hasValidFieldName || !hasValidFieldType || !isValidAdvancedFieldMappings}
            onClick={() => {
              onAddField({
                ...field,
                status: 'mapped',
              } as SchemaField);
              onClose();
            }}
          >
            {i18n.translate('xpack.streams.schemaEditor.addFieldFlyout.addButtonLabel', {
              defaultMessage: 'Add field',
            })}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};

interface FieldSelectorProps {
  value: string;
  onChange: (value: string) => void;
  fields: UseFieldsMetadataReturnType['fieldsMetadata'];
  isInvalid?: boolean;
  error?: string;
}

export const FieldNameSelector = ({
  value,
  onChange,
  fields,
  isInvalid,
  error,
}: FieldSelectorProps) => {
  const suggestions = useMemo(() => {
    if (!fields) return [];

    return Object.keys(fields).map((label) => ({
      label,
    }));
  }, [fields]);

  const selectedOptions = useMemo(() => {
    if (!value) return [];

    const matchingSuggestion = suggestions.find((suggestion) => suggestion.label === value);
    return matchingSuggestion ? [matchingSuggestion] : [{ label: value }];
  }, [value, suggestions]);

  const handleSelectionChange = useCallback(
    (newSelectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
      const selectedOption = newSelectedOptions[0];
      const newFieldValue = selectedOption?.label ?? '';
      onChange(newFieldValue);
    },
    [onChange]
  );

  const handleCreateOption = useCallback(
    (searchValue: string) => {
      const normalizedValue = searchValue.trim();
      if (normalizedValue) {
        handleSelectionChange([{ label: normalizedValue }]);
      }
    },
    [handleSelectionChange]
  );

  return (
    <EuiFormRow
      label={i18n.translate('xpack.streams.fieldSelector.defaultLabel', {
        defaultMessage: 'Field name',
      })}
      helpText={i18n.translate('xpack.streams.schemaEditor.addFieldFlyout.fieldTypeHelpText', {
        defaultMessage: 'We suggest general naming conventions like ECS or OTel.',
      })}
      isInvalid={isInvalid}
      error={error}
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
        isInvalid={isInvalid}
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
