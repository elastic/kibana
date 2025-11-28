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
import React, { useReducer, useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import useToggle from 'react-use/lib/useToggle';
import { FormattedMessage } from '@kbn/i18n-react';
import { SamplePreviewTable } from './sample_preview_table';
import { FieldSummary } from './field_summary';
import type { SchemaField } from '../types';
import { AdvancedFieldMappingOptions } from './advanced_field_mapping_options';
import type { SchemaEditorField } from '../types';

export interface SchemaEditorFlyoutProps {
  field: SchemaField;
  fields: SchemaEditorField[]; // full list passed from parent (context unavailable inside flyout overlay)
  isEditingByDefault?: boolean;
  onClose: () => void;
  onStage: (field: SchemaField) => void;
  stream: Streams.ingest.all.Definition;
  withFieldSimulation?: boolean;
}

export const SchemaEditorFlyout = ({
  field,
  fields,
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
  const [geoPointSuggestionApplied, setGeoPointSuggestionApplied] = useState(false);

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

  // Geo point suggestion logic (corrected):
  // Show suggestion ONLY when editing a '.lat' or '.lon' field, both suffix fields exist and are NOT mapped,
  // and the base field is not already mapped as geo_point.
  const geoPointSuggestion = useMemo(() => {
    const match = field.name.match(/^(.*)\.(lat|lon)$/);
    if (!match) return undefined; // only for suffix fields
    const base = match[1];
    // If current suffix already mapped, skip
    if (field.status === 'mapped') return undefined;
    // Locate sibling suffix
    const siblingSuffix = match[2] === 'lat' ? 'lon' : 'lat';
    const siblingName = `${base}.${siblingSuffix}`;
    const siblingField = fields.find((f) => f.name === siblingName);
    if (!siblingField) return undefined; // need both parts
    // If sibling mapped, skip
    if (siblingField.status === 'mapped') return undefined;
    // If base geo_point already mapped, skip
    const baseField = fields.find(
      (f) => f.name === base && f.type === 'geo_point' && f.status === 'mapped'
    );
    if (baseField) return undefined;
    return { base } as const;
  }, [field, fields]);

  return (
    <EuiFlyout ownFocus onClose={onClose} aria-labelledby={flyoutId} maxWidth={500}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{nextField.name}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      {isIgnoredField && (
        <EuiCallOut
          announceOnMount
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
      {geoPointSuggestion && !geoPointSuggestionApplied && (
        <EuiCallOut
          announceOnMount
          color="primary"
          title={i18n.translate('xpack.streams.schemaEditorFlyout.geoPointSuggestionTitle', {
            defaultMessage: 'Map as geo_point?',
          })}
        >
          <FormattedMessage
            id="xpack.streams.schemaEditorFlyout.geoPointSuggestionMessage"
            defaultMessage="You are editing a latitude/longitude component. Map '{base}' as a single geo_point field?"
            values={{ base: geoPointSuggestion.base }}
          />
          <EuiButtonEmpty
            size="s"
            data-test-subj="streamsAppGeoPointSuggestionApplyButton"
            onClick={() => {
              // Switch editing context to base field
              setNextField({
                name: geoPointSuggestion.base,
                type: 'geo_point',
                status: 'mapped',
                parent: field.parent,
              });
              setGeoPointSuggestionApplied(true);
            }}
            iconType="merge"
          >
            {i18n.translate('xpack.streams.schemaEditorFlyout.geoPointSuggestionApplyLabel', {
              defaultMessage: 'Map as geo_point',
            })}
          </EuiButtonEmpty>
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
                const staged = {
                  ...nextField,
                  status: 'mapped',
                } as SchemaField;
                onStage(staged);
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
