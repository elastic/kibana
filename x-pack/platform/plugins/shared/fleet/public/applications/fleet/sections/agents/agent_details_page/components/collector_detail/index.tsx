/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiLoadingSpinner, EuiPanel, EuiSpacer } from '@elastic/eui';

import type { Agent } from '../../../../../types';
import { useGetAgentEffectiveConfigQuery } from '../../../../../hooks';
import { CollectorConfigView } from '../../../../../../../components/otel_ui';
import { CollectorMetricsProvider } from '../../../../../../../components/otel_ui/collector_config_view/collector_metrics_context';
import { CollectorDetailTabs } from '../../../../../../../components/otel_ui/collector_config_view/collector_detail/collector_detail_tabs';

export const CollectorDetailsContent: React.FunctionComponent<{ agent: Agent }> = ({ agent }) => {
  const { data: configData, isLoading } = useGetAgentEffectiveConfigQuery(agent.id);
  const config = configData?.effective_config ?? {};
  const serviceInstanceId = String(
    agent.non_identifying_attributes?.['elastic.display.name'] ?? agent.id
  );

  if (isLoading) {
    return <EuiLoadingSpinner />;
  }

  return (
    <CollectorMetricsProvider serviceInstanceId={serviceInstanceId}>
      <EuiPanel paddingSize="m" hasBorder>
        <CollectorConfigView config={config} health={agent.health} />
      </EuiPanel>

      <EuiSpacer size="m" />

      <EuiPanel paddingSize="m" hasBorder>
        <CollectorDetailTabs
          agent={agent}
          config={config}
          health={agent.health}
          isConfigLoading={isLoading}
        />
      </EuiPanel>

      <EuiSpacer size="m" />
    </CollectorMetricsProvider>
  );
};
