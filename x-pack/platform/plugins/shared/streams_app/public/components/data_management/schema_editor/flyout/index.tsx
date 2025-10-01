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
  EuiCallOut,
  EuiFlyout,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useReducer, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import useToggle from 'react-use/lib/useToggle';
import { FormattedMessage } from '@kbn/i18n-react';
import { SamplePreviewTable } from './sample_preview_table';
import { FieldSummary } from './field_summary';
import type { SchemaField } from '../types';
import { AdvancedFieldMappingOptions } from './advanced_field_mapping_options';

export interface SchemaEditorFlyoutProps {
  field: SchemaField;
  isEditingByDefault?: boolean;
  onClose: () => void;
  onStage: (field: SchemaField) => void;
  stream: Streams.ingest.all.Definition;
  withFieldSimulation?: boolean;
}

export const SchemaEditorFlyout = ({
  field,
  stream,
  onClose,
  onStage,
  isEditingByDefault = false,
  withFieldSimulation = false,
}: SchemaEditorFlyoutProps) => {
  const [isEditing, toggleEditMode] = useToggle(isEditingByDefault);
  const [isValidAdvancedFieldMappings, setValidAdvancedFieldMappings] = useState(true);
  const [isValidSimulation, setValidSimulation] = useState(true);
  const [isIgnoredField, setIsIgnoredField] = useState(false);

  const flyoutId = useGeneratedHtmlId({ prefix: 'streams-edit-field' });

  const [nextField, setNextField] = useReducer(
    (prev: SchemaField, updated: Partial<SchemaField>) =>
      ({
        ...prev,
        ...updated,
      } as SchemaField),
    field
  );

  const hasValidFieldType = nextField.type !== undefined;

  const onValidate = ({ isValid, isIgnored }: { isValid: boolean; isIgnored: boolean }) => {
    setIsIgnoredField(isIgnored);
    setValidSimulation(isValid);
  };

  return (
    <EuiFlyout ownFocus onClose={onClose} aria-labelledby={flyoutId} maxWidth={500}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{field.name}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      {isIgnoredField && (
        <EuiCallOut
          color="warning"
          iconType="warning"
          title={i18n.translate('xpack.streams.samplePreviewTable.ignoredFieldsCallOutTitle', {
            defaultMessage: 'Ignored field',
          })}
        >
          <FormattedMessage
            id="xpack.streams.samplePreviewTable.ignoredFieldsCallOutMessage"
            defaultMessage="This field was ignored in some ingested documents due to type mismatch or mapping errors."
          />
        </EuiCallOut>
      )}

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
            value={nextField.additionalParameters}
            onChange={(additionalParameters) => setNextField({ additionalParameters })}
            onValidate={setValidAdvancedFieldMappings}
            isEditing={isEditing}
          />
          {withFieldSimulation && (
            <EuiFlexItem grow={false}>
              <SamplePreviewTable stream={stream} nextField={nextField} onValidate={onValidate} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutBody>
      {isEditing && (
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
              data-test-subj="streamsAppSchemaEditorFieldStageButton"
              disabled={!hasValidFieldType || !isValidAdvancedFieldMappings || !isValidSimulation}
              onClick={() => {
                onStage({
                  ...nextField,
                  status: 'mapped',
                } as SchemaField);
                if (onClose) onClose();
              }}
            >
              {i18n.translate('xpack.streams.fieldForm.stageButtonLabel', {
                defaultMessage: 'Stage changes',
              })}
            </EuiButton>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      )}
    </EuiFlyout>
  );
};
