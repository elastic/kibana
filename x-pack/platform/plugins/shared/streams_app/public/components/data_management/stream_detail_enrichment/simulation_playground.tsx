/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexItem, EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { isWiredStreamGetResponse } from '@kbn/streams-schema';
import { ProcessorOutcomePreview } from './processor_outcome_preview';
import {
  useStreamEnrichmentEvents,
  useStreamsEnrichmentSelector,
} from './state_management/stream_enrichment_state_machine';

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
      {isViewingDetectedFields &&
        i18n.translate('xpack.streams.simulationPlayground.div.detectedFieldsLabel', {
          defaultMessage: 'WIP',
        })}
    </>
  );
};
