/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense, useMemo, useState } from 'react';
import {
  EuiCallOut,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { Agent } from '../../../../../types';
import { useGetAgentEffectiveConfigQuery } from '../../../../../hooks';
import { Loading } from '../../../../../components';

import { PipelineSelector } from '../../../../../../../components/otel_ui/collector_config_view/pipeline_selector';
import { CollectorDetailTabs } from '../../../../../../../components/otel_ui/collector_config_view/collector_detail/collector_detail_tabs';
// import { ErrorPatternPanel } from '../../../../../../../components/otel_ui/collector_config_view/error_pattern_panel';

const GraphView = lazy(() =>
  import('../../../../../../../components/otel_ui/collector_config_view/graph_view/index').then(
    (m) => ({ default: m.GraphView })
  )
);

const ALL_PIPELINES = '__all__';

export const CollectorDetailsContent: React.FunctionComponent<{ agent: Agent }> = ({ agent }) => {
  const { data: configData, isLoading: isConfigLoading } = useGetAgentEffectiveConfigQuery(
    agent.id
  );
  const config = configData?.effective_config ?? {};
  const [selectedPipelineId, setSelectedPipelineId] = useState(ALL_PIPELINES);

  const pipelineIds = useMemo(
    () => Object.keys(config?.service?.pipelines ?? {}),
    [config?.service?.pipelines]
  );

  return (
    <>
      {/* Pipeline Graph */}
      <EuiPanel paddingSize="m" hasBorder>
        {isConfigLoading ? (
          <Loading />
        ) : pipelineIds.length === 0 ? (
          <EuiCallOut
            title={i18n.translate('xpack.fleet.collectorDetail.noPipelines', {
              defaultMessage: 'No pipelines configured',
            })}
            iconType="visLine"
            color="primary"
          />
        ) : (
          <Suspense fallback={<EuiLoadingSpinner />}>
            <PipelineSelector
              pipelineIds={pipelineIds}
              selectedPipelineId={selectedPipelineId}
              onChange={setSelectedPipelineId}
            />
            <EuiSpacer size="m" />
            <GraphView
              config={config}
              selectedPipelineId={selectedPipelineId}
              health={agent.health}
            />
          </Suspense>
        )}
      </EuiPanel>

      <EuiSpacer size="m" />

      {/* Tabbed detail panel: Health, Info, Configuration */}
      <EuiPanel paddingSize="m" hasBorder>
        <CollectorDetailTabs
          agent={agent}
          config={config}
          health={agent.health}
          isConfigLoading={isConfigLoading}
        />
      </EuiPanel>

      <EuiSpacer size="m" />

      {/* Error pattern panel — will be implemented in https://github.com/elastic/ingest-dev/issues/7074 */}
      {/* <ErrorPatternPanel agentId={agent.id} /> */}

      <EuiSpacer size="xl" />
    </>
  );
};
