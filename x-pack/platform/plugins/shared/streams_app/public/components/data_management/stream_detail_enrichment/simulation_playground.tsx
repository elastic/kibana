/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiNotificationBadge,
  EuiProgress,
  EuiSpacer,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import { Streams } from '@kbn/streams-schema';
import { ProcessorOutcomePreview } from './processor_outcome_preview';
import {
  useSimulatorSelector,
  useStreamEnrichmentEvents,
  useStreamEnrichmentSelector,
} from './state_management/stream_enrichment_state_machine';
import { DetectedFieldsEditor } from './detected_fields_editor';
import { DataSourcesList } from './data_sources_list';
import { selectFieldsInSamples } from './state_management/simulation_state_machine/selectors';
import type { SchemaEditorField } from '../schema_editor/types';

export const SimulationPlayground = () => {
  const { refreshSimulation, viewSimulationPreviewData, viewSimulationDetectedFields } =
    useStreamEnrichmentEvents();

  const isViewingDataPreview = useStreamEnrichmentSelector((state) =>
    state.matches({
      ready: { enrichment: { displayingSimulation: 'viewDataPreview' } },
    })
  );
  const isViewingDetectedFields = useStreamEnrichmentSelector((state) =>
    state.matches({
      ready: { enrichment: { displayingSimulation: 'viewDetectedFields' } },
    })
  );

  const detectedFields = useSimulatorSelector((state) => state.context.detectedSchemaFields);
  const fieldsInSamples = useSimulatorSelector((state) => selectFieldsInSamples(state.context));
  const definition = useStreamEnrichmentSelector((state) => state.context.definition);
  const definitionFields = useStreamEnrichmentSelector((state) => {
    const def = state.context.definition;
    if (Streams.WiredStream.GetResponse.is(def)) {
      return def.stream.ingest.wired.fields;
    }
    return def.stream.ingest.classic.field_overrides;
  });
  const inheritedFields = useStreamEnrichmentSelector((state) => {
    const def = state.context.definition;
    if (Streams.WiredStream.GetResponse.is(def)) {
      return def.inherited_fields;
    }
    return undefined;
  });

  const schemaEditorFields = useMemo(() => {
    const streamName = Streams.WiredStream.GetResponse.is(definition)
      ? definition.stream.name
      : Streams.ClassicStream.GetResponse.is(definition)
      ? definition.stream.name
      : '';

    // Create lookup maps for efficient comparison
    const definitionFieldsMap = new Map(definitionFields ? Object.entries(definitionFields) : []);
    const inheritedFieldsMap = new Map(inheritedFields ? Object.entries(inheritedFields) : []);
    const processedFieldNames = new Set<string>();

    const result: SchemaEditorField[] = [];

    // Create a set of field names in samples for quick lookup
    const fieldsInSamplesSet = new Set(fieldsInSamples);

    // Step 1: Process detected fields first
    detectedFields.forEach((detectedField) => {
      const definitionField = definitionFieldsMap.get(detectedField.name);
      const inheritedField = inheritedFieldsMap.get(detectedField.name);
      const isInSamples = fieldsInSamplesSet.has(detectedField.name);
      let fieldResult: SchemaEditorField['result'];

      if (isInSamples) {
        // Field exists in samples AND in detected fields - modified by the simulated processing steps
        fieldResult = 'modified';
      } else {
        // Field not in samples - it's new
        fieldResult = 'new';
      }

      // If the detected field matches an inherited field, preserve the inherited properties
      if (inheritedField && !definitionField && inheritedField.type !== 'system') {
        result.push({
          ...detectedField,
          status: 'inherited',
          parent: inheritedField.from,
          type: detectedField.type ?? inheritedField.type,
          result: fieldResult,
        } as SchemaEditorField);
      } else {
        result.push({
          ...detectedField,
          result: fieldResult,
        });
      }
      processedFieldNames.add(detectedField.name);
    });

    // Step 2: Add inherited fields that weren't in detected fields
    inheritedFieldsMap.forEach((fieldConfig, fieldName) => {
      if (!processedFieldNames.has(fieldName) && !fieldConfig.alias_for) {
        // Create a SchemaField from the inherited field
        const schemaField: SchemaEditorField = {
          name: fieldName,
          parent: fieldConfig.from,
          status: 'inherited',
          type: fieldConfig.type !== 'system' ? fieldConfig.type : undefined,
          alias_for: fieldConfig.alias_for,
          ...(fieldConfig.type !== 'system' && 'format' in fieldConfig && fieldConfig.format
            ? { format: fieldConfig.format }
            : {}),
          result: 'unchanged',
        } as SchemaEditorField;

        result.push(schemaField);
        processedFieldNames.add(fieldName);
      }
    });

    // Step 3: Add definition fields that weren't in detected fields
    definitionFieldsMap.forEach((fieldConfig, fieldName) => {
      if (!processedFieldNames.has(fieldName)) {
        // Create a SchemaField from the definition field
        const schemaField: SchemaEditorField = {
          name: fieldName,
          parent: streamName,
          status: 'mapped',
          type: fieldConfig.type !== 'system' ? fieldConfig.type : undefined,
          ...(fieldConfig.type !== 'system' && 'format' in fieldConfig && fieldConfig.format
            ? { format: fieldConfig.format }
            : {}),
          result: 'unchanged',
        } as SchemaEditorField;

        result.push(schemaField);
        processedFieldNames.add(fieldName);
      }
    });

    // Step 4: Add fields from samples that are in neither definition nor detected
    fieldsInSamples.forEach((fieldName) => {
      if (!processedFieldNames.has(fieldName)) {
        const unmappedField: SchemaEditorField = {
          name: fieldName,
          parent: streamName,
          status: 'unmapped',
          result: 'unchanged',
        };

        result.push(unmappedField);
        processedFieldNames.add(fieldName);
      }
    });

    return result;
  }, [detectedFields, fieldsInSamples, definitionFields, inheritedFields, definition]);

  // Only fields that come from detected fields should be editable (map/unmap)
  const editableFields = useMemo(() => {
    return detectedFields.map((field) => field.name);
  }, [detectedFields]);

  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem>
            <EuiTabs bottomBorder={false}>
              <EuiTab
                isSelected={isViewingDataPreview}
                onClick={viewSimulationPreviewData}
                append={
                  <EuiButtonIcon
                    iconType="refresh"
                    onClick={refreshSimulation}
                    aria-label={i18n.translate(
                      'xpack.streams.streamDetailView.managementTab.enrichment.simulationPlayground.refreshPreviewAriaLabel',
                      { defaultMessage: 'Refresh data preview' }
                    )}
                  />
                }
              >
                {i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.simulationPlayground.dataPreview',
                  { defaultMessage: 'Data preview' }
                )}
              </EuiTab>
              <EuiTab
                isSelected={isViewingDetectedFields}
                onClick={viewSimulationDetectedFields}
                append={
                  detectedFields.length > 0 ? (
                    <EuiNotificationBadge size="m">{detectedFields.length}</EuiNotificationBadge>
                  ) : undefined
                }
              >
                {i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.simulationPlayground.detectedFields',
                  { defaultMessage: 'Fields' }
                )}
              </EuiTab>
            </EuiTabs>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <DataSourcesList />
          </EuiFlexItem>
          <ProgressBar />
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiSpacer size="m" />
      {isViewingDataPreview && <ProcessorOutcomePreview />}
      {isViewingDetectedFields && (
        <DetectedFieldsEditor
          schemaEditorFields={schemaEditorFields}
          editableFields={editableFields}
        />
      )}
    </>
  );
};

const ProgressBar = () => {
  const isLoading = useSimulatorSelector(
    (state) => state.matches('debouncingChanges') || state.matches('runningSimulation')
  );

  return isLoading && <EuiProgress size="xs" color="accent" position="absolute" />;
};
