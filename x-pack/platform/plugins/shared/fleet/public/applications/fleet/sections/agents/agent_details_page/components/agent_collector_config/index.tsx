/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiLoadingSpinner } from '@elastic/eui';

import type { Agent } from '../../../../../types';
import { useGetAgentEffectiveConfigQuery } from '../../../../../hooks';
import { CollectorConfigView } from '../../../../../../../components/otel_ui';

export const AgentCollectorConfig: React.FunctionComponent<{ agent: Agent }> = ({ agent }) => {
  const { data: agentData, isLoading } = useGetAgentEffectiveConfigQuery(agent.id);

  if (isLoading) {
    return <EuiLoadingSpinner />;
  }

  return <CollectorConfigView config={agentData?.effective_config ?? {}} />;
};
