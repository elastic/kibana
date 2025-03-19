/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiTitle,
  EuiButton,
} from '@elastic/eui';
import React, { useReducer } from 'react';
import { i18n } from '@kbn/i18n';
import { WiredStreamDefinition } from '@kbn/streams-schema';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import useToggle from 'react-use/lib/useToggle';
import { SamplePreviewTable } from './sample_preview_table';
import { FieldSummary } from './field_summary';
import { SchemaField } from '../types';
import { AdvancedFieldMappingOptions } from './advanced_field_mapping_options';

export interface SchemaEditorFlyoutProps {
  field: SchemaField;
  isEditingByDefault?: boolean;
  onClose?: () => void;
  onSave: (field: SchemaField) => void;
  stream: WiredStreamDefinition;
  withFieldSimulation?: boolean;
}

export const SchemaEditorFlyout = ({
  field,
  stream,
  onClose,
  onSave,
  isEditingByDefault = false,
  withFieldSimulation = false,
}: SchemaEditorFlyoutProps) => {
  const [isEditing, toggleEditMode] = useToggle(isEditingByDefault);

  const [nextField, setNextField] = useReducer(
    (prev: SchemaField, updated: Partial<SchemaField>) =>
      ({
        ...prev,
        ...updated,
      } as SchemaField),
    field
  );

  const [{ loading: isSaving }, saveChanges] = useAsyncFn(async () => {
    await onSave(nextField);
    if (onClose) onClose();
  }, [nextField, onClose, onSave]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{field.name}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFlexGroup direction="column">
          <FieldSummary
            field={nextField}
            isEditing={isEditing}
            toggleEditMode={toggleEditMode}
            onChange={setNextField}
            stream={stream}
          />
          <AdvancedFieldMappingOptions
            field={nextField}
            onChange={setNextField}
            isEditing={isEditing}
          />
          {withFieldSimulation && (
            <EuiFlexItem grow={false}>
              <SamplePreviewTable stream={stream} nextField={nextField} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiButtonEmpty
            data-test-subj="streamsAppSchemaEditorFlyoutCloseButton"
            iconType="cross"
            onClick={onClose}
            flush="left"
          >
            {i18n.translate('xpack.streams.schemaEditorFlyout.closeButtonLabel', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>
          <EuiButton
            data-test-subj="streamsAppSchemaEditorFieldSaveButton"
            isLoading={isSaving}
            onClick={saveChanges}
          >
            {i18n.translate('xpack.streams.fieldForm.saveButtonLabel', {
              defaultMessage: 'Save changes',
            })}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
