/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense, useMemo, useState } from 'react';

import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { OTelCollectorConfig } from '../../../../common/types';

import { ALL_PIPELINES } from './utils';
import { PipelineSelector } from './pipeline_selector';

const GraphView = lazy(() => import('./graph_view').then((m) => ({ default: m.GraphView })));

interface CollectorConfigViewProps {
  config: OTelCollectorConfig;
}

export const CollectorConfigView: React.FunctionComponent<CollectorConfigViewProps> = ({
  config,
}) => {
  const [selectedPipelineId, setSelectedPipelineId] = useState(ALL_PIPELINES);

  const pipelineIds = useMemo(
    () => Object.keys(config?.service?.pipelines ?? {}),
    [config?.service?.pipelines]
  );

  if (pipelineIds.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="visLine"
        title={
          <h3>
            <FormattedMessage
              id="xpack.fleet.otelUi.collectorConfigView.noPipelinesTitle"
              defaultMessage="No pipelines configured"
            />
          </h3>
        }
        body={
          <FormattedMessage
            id="xpack.fleet.otelUi.collectorConfigView.noPipelinesBody"
            defaultMessage="This collector configuration does not contain any pipelines to visualize."
          />
        }
      />
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <PipelineSelector
          pipelineIds={pipelineIds}
          selectedPipelineId={selectedPipelineId}
          onChange={setSelectedPipelineId}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <Suspense fallback={<EuiLoadingSpinner />}>
          <GraphView config={config} selectedPipelineId={selectedPipelineId} />
        </Suspense>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
