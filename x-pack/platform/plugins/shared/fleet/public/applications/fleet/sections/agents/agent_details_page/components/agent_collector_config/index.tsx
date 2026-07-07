/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';

import type { Agent } from '../../../../../types';
import { useGetAgentEffectiveConfigQuery } from '../../../../../hooks';
import { CollectorConfigView } from '../../../../../../../components/otel_ui';
import { CollectorContextProvider } from '../../../../../../../components/otel_ui/collector_config_view/collector_context';

const NON_REPORTING_STATUSES: Array<NonNullable<Agent['status']>> = [
  'offline',
  'inactive',
  'unenrolled',
  'uninstalled',
];

export const AgentCollectorConfig: React.FunctionComponent<{ agent: Agent }> = ({ agent }) => {
  const { data: agentData, isLoading } = useGetAgentEffectiveConfigQuery(agent.id);
  const offlineAt =
    agent.status && NON_REPORTING_STATUSES.includes(agent.status) ? agent.last_checkin : undefined;

  if (isLoading) {
    return <EuiLoadingSpinner />;
  }

  return (
    <CollectorContextProvider
      serviceInstanceId={String(
        agent.non_identifying_attributes?.['elastic.display.name'] ?? agent.id
      )}
      offlineAt={offlineAt}
    >
      <CollectorConfigView config={agentData?.effective_config ?? {}} health={agent.health} />
      <EuiSpacer size="l" />
    </CollectorContextProvider>
  );
};
