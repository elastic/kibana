/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

<<<<<<< HEAD
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexItem, EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { isWiredStreamGetResponse } from '@kbn/streams-schema';
import { ProcessorOutcomePreview } from './processor_outcome_preview';
import {
  useStreamEnrichmentEvents,
  useStreamsEnrichmentSelector,
} from './state_management/stream_enrichment_state_machine';
=======
import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexItem, EuiSpacer, EuiTab, EuiTabs, EuiText, useEuiTheme } from '@elastic/eui';
import {
  getAdvancedParameters,
  IngestStreamGetResponse,
  WiredStreamGetResponse,
  isWiredStreamGetResponse,
} from '@kbn/streams-schema';
import { css } from '@emotion/react';
import { ProcessorOutcomePreview } from './processor_outcome_preview';
import { TableColumn, UseProcessingSimulatorReturn } from './hooks/use_processing_simulator';
import { SchemaEditor } from '../schema_editor';
import { SchemaField } from '../schema_editor/types';
>>>>>>> 16bf980cd90 (feat(streams): set foundation for schema editor)

export const SimulationPlayground = () => {
  const isViewingDataPreview = useStreamsEnrichmentSelector((state) =>
    state.matches({
      ready: { enrichment: { displayingSimulation: 'viewDataPreview' } },
    })
  );
  const isViewingDetectedFields = useStreamsEnrichmentSelector((state) =>
    state.matches({
      ready: { enrichment: { displayingSimulation: 'viewDetectedFields' } },
    })
  );
  const canViewDetectedFields = useStreamsEnrichmentSelector((state) =>
    isWiredStreamGetResponse(state.context.definition)
  );

  const { viewSimulationPreviewData, viewSimulationDetectedFields } = useStreamEnrichmentEvents();

  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiTabs bottomBorder={false}>
          <EuiTab isSelected={isViewingDataPreview} onClick={viewSimulationPreviewData}>
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.simulationPlayground.dataPreview',
              { defaultMessage: 'Data preview' }
            )}
          </EuiTab>
          {canViewDetectedFields && (
            <EuiTab isSelected={isViewingDetectedFields} onClick={viewSimulationDetectedFields}>
              {i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.simulationPlayground.detectedFields',
                { defaultMessage: 'Detected fields' }
              )}
            </EuiTab>
          )}
        </EuiTabs>
      </EuiFlexItem>
      <EuiSpacer size="m" />
      {isViewingDataPreview && <ProcessorOutcomePreview />}
      {isViewingDetectedFields &&<DetectedFieldsEditor
        definition={definition}
        isLoading={isLoading}
        simulation={simulation}
      />}
    </>
  );
};

interface DetectedFieldsEditorProps {
  definition: WiredStreamGetResponse;
  isLoading: boolean;
  simulation: UseProcessingSimulatorReturn['simulation'];
}

const DetectedFieldsEditor = ({ definition, isLoading, simulation }: DetectedFieldsEditorProps) => {
  const { euiTheme } = useEuiTheme();

  const fields = useMemo(() => {
    const simulationFields = simulation?.detected_fields ?? [];

    const schemaFields: SchemaField[] = simulationFields.map((field) => {
      // Detected fields already inherited
      if ('from' in field) {
        return {
          name: field.name,
          type: field.type,
          format: field.format,
          parent: field.from,
          status: 'inherited',
        };
      }
      // Detected fields already mapped
      if ('type' in field) {
        return {
          name: field.name,
          type: field.type,
          format: field.format,
          parent: definition.stream.name,
          status: 'mapped',
        };
      }
      // Detected fields still unmapped
      return {
        name: field.name,
        parent: definition.stream.name,
        status: 'unmapped',
      };
    });

    return schemaFields.sort(compareFieldsByStatus);
  }, [definition, simulation]);

  const unmapField = (fieldName: string) => {};

  const updateField = (field: SchemaField) => {};

  const refreshFields = () => {};

  return (
    <>
      <EuiText
        component="p"
        color="subdued"
        size="xs"
        css={css`
          margin-bottom: ${euiTheme.size.base};
        `}
      >
        {i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.simulationPlayground.detectedFieldsHeadline',
          { defaultMessage: 'You can review and adjust saved fields further in the Schema Editor.' }
        )}
      </EuiText>
      <SchemaEditor
        fields={fields}
        isLoading={isLoading}
        stream={definition.stream}
        onFieldUnmap={unmapField}
        onFieldUpdate={updateField}
        onRefreshData={refreshFields}
        withTableActions
      />
    </>
  );
};

const statusOrder = { inherited: 0, mapped: 1, unmapped: 2 };
const compareFieldsByStatus = (curr: SchemaField, next: SchemaField) => {
  return statusOrder[curr.status] - statusOrder[next.status];
};
