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
    // Create lookup maps for efficient comparison
    const definitionFieldsMap = new Map(definitionFields ? Object.entries(definitionFields) : []);
    const inheritedFieldsMap = new Map(inheritedFields ? Object.entries(inheritedFields) : []);

    const result: SchemaEditorField[] = [];

    // Create a set of field names in samples for quick lookup
    const fieldsInSamplesSet = new Set(fieldsInSamples);

    // Process only detected fields
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
      } else if (definitionField) {
        // Merge with definition field to preserve any additional properties
        result.push({
          ...detectedField,
          result: fieldResult,
        });
      } else {
        result.push({
          ...detectedField,
          result: fieldResult,
        });
      }
    });

    return result;
  }, [detectedFields, fieldsInSamples, definitionFields, inheritedFields]);

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
                  { defaultMessage: 'Modified fields' }
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
      {isViewingDetectedFields && <DetectedFieldsEditor schemaEditorFields={schemaEditorFields} />}
    </>
  );
};

const ProgressBar = () => {
  const isLoading = useSimulatorSelector(
    (state) => state.matches('debouncingChanges') || state.matches('runningSimulation')
  );

  return isLoading && <EuiProgress size="xs" color="accent" position="absolute" />;
};
