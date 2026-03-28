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
import React, { useMemo, useReducer, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { Streams } from '@kbn/streams-schema';
import useToggle from 'react-use/lib/useToggle';
import { FormattedMessage } from '@kbn/i18n-react';
import { SamplePreviewTable } from './sample_preview_table';
import { FieldSummary } from './field_summary';
import type { SchemaField } from '../types';
import { getGeoPointSuggestion } from '../utils';
import { AdvancedFieldMappingOptions } from './advanced_field_mapping_options';

export interface SchemaEditorFlyoutProps {
  field: SchemaField;
  isEditingByDefault?: boolean;
  applyGeoPointSuggestion?: boolean;
  onClose: () => void;
  onStage: (field: SchemaField) => void;
  stream: Streams.ingest.all.Definition;
  withFieldSimulation?: boolean;
  fields?: SchemaField[];
  enableGeoPointSuggestions?: boolean;
  /**
   * When true, the flyout is in description-only editing mode.
   * In this mode, the type selector is hidden and only description can be edited.
   * This is used for inherited fields and unmapped fields where the user explicitly
   * chose to edit description only.
   */
  isDescriptionOnlyMode?: boolean;
  onGoToField?: (fieldName: string) => void;
}

export const SchemaEditorFlyout = ({
  field,
  stream,
  onClose,
  onStage,
  isEditingByDefault = false,
  applyGeoPointSuggestion: applyGeoPointSuggestionProp = false,
  withFieldSimulation = false,
  fields,
  enableGeoPointSuggestions = true,
  isDescriptionOnlyMode = false,
  onGoToField,
}: SchemaEditorFlyoutProps) => {
  const [isEditing, toggleEditMode] = useToggle(isEditingByDefault);
  const [isValidAdvancedFieldMappings, setValidAdvancedFieldMappings] = useState(true);
  const [isValidSimulation, setValidSimulation] = useState(true);
  const [isIgnoredField, setIsIgnoredField] = useState(false);
  const [isExpensiveQueriesError, setIsExpensiveQueriesError] = useState(false);
  const [geoPointSuggestionApplied, setGeoPointSuggestionApplied] = useState(
    applyGeoPointSuggestionProp
  );

  const flyoutId = useGeneratedHtmlId({ prefix: 'streams-edit-field' });

  const geoPointSuggestion = useMemo(() => {
    if (!enableGeoPointSuggestions) {
      return null;
    }
    return getGeoPointSuggestion({
      fieldName: field.name,
      fields,
      streamType: Streams.WiredStream.Definition.is(stream) ? 'wired' : 'classic',
    });
  }, [enableGeoPointSuggestions, field.name, fields, stream]);

  const streamType = Streams.WiredStream.Definition.is(stream) ? 'wired' : 'classic';

  const initialField = useMemo(() => {
    if (applyGeoPointSuggestionProp && geoPointSuggestion) {
      return {
        name: geoPointSuggestion.base,
        type: 'geo_point' as const,
        status: 'mapped' as const,
        parent: field.parent,
      };
    }
    return field;
  }, [applyGeoPointSuggestionProp, geoPointSuggestion, field]);

  const [nextField, setNextField] = useReducer(
    (prev: SchemaField, updated: Partial<SchemaField>) =>
      ({
        ...prev,
        ...updated,
      } as SchemaField),
    initialField
  );

  const hasValidFieldType = nextField.type !== undefined;
  // Description-only editing is only allowed for wired streams.
  // Classic streams require a type to be specified to add a description.
  // This applies to:
  // 1. Inherited fields (can only add description override)
  // 2. When explicitly requested via isDescriptionOnlyMode prop
  const isDescriptionOnlyEditing =
    isEditing && streamType === 'wired' && (field.status === 'inherited' || isDescriptionOnlyMode);
  const isDocOnlyField = field.status === 'unmapped' && !field.type;
  const hasDescriptionChanged =
    (nextField.description ?? undefined) !== (field.description ?? undefined);
  const isInheritedDescriptionOnlyEditing =
    isDescriptionOnlyEditing && field.status === 'inherited';
  // For wired streams, unmapped fields can have description-only changes without selecting a type.
  // This also applies when user explicitly selects "Unmapped" from the type dropdown.
  const isUnmappedDescriptionOnlyChange =
    isEditing &&
    streamType === 'wired' &&
    field.status === 'unmapped' &&
    !field.type &&
    (!nextField.type || nextField.type === 'unmapped') &&
    hasDescriptionChanged;

  const onValidate = ({
    isValid,
    isIgnored,
    isExpensiveQueries,
  }: {
    isValid: boolean;
    isIgnored: boolean;
    isExpensiveQueries: boolean;
  }) => {
    setIsIgnoredField(isIgnored);
    setValidSimulation(isValid);
    setIsExpensiveQueriesError(isExpensiveQueries);
  };

  return (
    <EuiFlyout ownFocus onClose={onClose} aria-labelledby={flyoutId} maxWidth={500}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{nextField.name}</h2>
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

      {geoPointSuggestion && !geoPointSuggestionApplied && (
        <>
          <EuiCallOut
            color="primary"
            iconType="waypoint"
            title={i18n.translate('xpack.streams.schemaEditorFlyout.geoPointSuggestionTitle', {
              defaultMessage: 'Map as geo_point?',
            })}
          >
            <p>
              <FormattedMessage
                id="xpack.streams.schemaEditorFlyout.geoPointSuggestionMessage"
                defaultMessage="You are editing a latitude/longitude component. Map {base} as a single geo_point field?"
                values={{ base: geoPointSuggestion.base }}
              />
            </p>
            <EuiButton
              size="s"
              onClick={() => {
                setNextField({
                  name: geoPointSuggestion.base,
                  type: 'geo_point',
                  status: 'mapped',
                  parent: field.parent,
                });
                setGeoPointSuggestionApplied(true);
                if (!isEditing) {
                  toggleEditMode(true);
                }
              }}
            >
              <FormattedMessage
                id="xpack.streams.schemaEditorFlyout.mapAsGeoPointButton"
                defaultMessage="Map as Geo point"
              />
            </EuiButton>
          </EuiCallOut>
        </>
      )}

      <EuiFlyoutBody>
        <EuiFlexGroup direction="column">
          <FieldSummary
            field={nextField}
            isEditing={isEditing}
            isDescriptionOnlyEditing={isDescriptionOnlyEditing}
            toggleEditMode={toggleEditMode}
            onChange={setNextField}
            stream={stream}
            enableGeoPointSuggestions={enableGeoPointSuggestions}
            onGoToField={onGoToField}
          />
          {nextField.type && !isDescriptionOnlyEditing && !nextField.alias_for && (
            <AdvancedFieldMappingOptions
              value={nextField.additionalParameters}
              onChange={(additionalParameters) => setNextField({ additionalParameters })}
              onValidate={setValidAdvancedFieldMappings}
              isEditing={isEditing}
            />
          )}
          {withFieldSimulation &&
            nextField.type &&
            !isDescriptionOnlyEditing &&
            !nextField.alias_for && (
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
              disabled={
                // In description-only mode, we don't require a valid field type
                // For wired streams, unmapped fields can have description-only changes
                (!isDescriptionOnlyEditing &&
                  !isUnmappedDescriptionOnlyChange &&
                  !hasValidFieldType) ||
                !isValidAdvancedFieldMappings ||
                // For inherited fields in description-only mode, require description change
                (isInheritedDescriptionOnlyEditing && !hasDescriptionChanged) ||
                // For doc-only fields in description-only mode, require description change
                (isDescriptionOnlyEditing && isDocOnlyField && !hasDescriptionChanged) ||
                (!isValidSimulation && !isExpensiveQueriesError)
              }
              onClick={() => {
                const stagedParent = stream.name;

                const stagedField = (() => {
                  if (isDescriptionOnlyEditing) {
                    if (field.status === 'inherited') {
                      // Keep the inherited status and original parent so the table
                      // continues to show the correct parent stream.
                      // buildSchemaSavePayload handles persisting the description
                      // override for inherited fields.
                      return {
                        ...field,
                        description: nextField.description,
                      } as SchemaField;
                    }

                    return {
                      name: nextField.name,
                      parent: stagedParent,
                      status: 'unmapped',
                      description: nextField.description,
                    } as SchemaField;
                  }

                  // For wired streams, unmapped fields can have description-only changes
                  // without selecting a type - stage as doc-only override
                  if (isUnmappedDescriptionOnlyChange) {
                    return {
                      name: nextField.name,
                      parent: stagedParent,
                      status: 'unmapped',
                      description: nextField.description,
                    } as SchemaField;
                  }

                  // If user selected 'unmapped' type, exclude it from the staged field.
                  // 'unmapped' is a UI-only pseudo-type representing "no mapping".
                  const { type: rawType, ...fieldWithoutType } = nextField;
                  const effectiveType = rawType === 'unmapped' ? undefined : rawType;

                  return {
                    ...fieldWithoutType,
                    ...(effectiveType !== undefined ? { type: effectiveType } : {}),
                    parent: stagedParent,
                    status: effectiveType !== undefined ? 'mapped' : 'unmapped',
                  } as SchemaField;
                })();

                onStage(stagedField);
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
