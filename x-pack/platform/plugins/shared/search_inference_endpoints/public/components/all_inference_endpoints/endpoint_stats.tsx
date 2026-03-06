/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTextColor } from '@elastic/eui';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import { getModelId } from '../../utils/get_model_id';
import {
  SERVICES_LABEL,
  MODELS_LABEL,
  TYPES_LABEL,
  ENDPOINTS_LABEL,
} from './endpoint_stats_translations';

interface EndpointStatsProps {
  endpoints: InferenceInferenceEndpointInfo[];
}

interface StatItemProps {
  label: string;
  count: number;
  testSubj: string;
}

const statItemStyles = ({ euiTheme }: UseEuiTheme) => css`
  &:not(:last-child) {
    border-right: ${euiTheme.border.thin};
    padding-right: ${euiTheme.size.m};
  }
`;

const StatItem: React.FC<StatItemProps> = ({ label, count, testSubj }) => (
  <EuiText size="s">
    <EuiTextColor color="subdued">{label}</EuiTextColor>&nbsp;
    <strong>
      <span data-test-subj={testSubj}>{count}</span>
    </strong>
  </EuiText>
);

export const EndpointStats: React.FC<EndpointStatsProps> = ({ endpoints }) => {
  const stats = useMemo(() => {
    const services = new Set<string>();
    const models = new Set<string>();
    const types = new Set<string>();

    endpoints.forEach((endpoint) => {
      services.add(endpoint.service);
      types.add(endpoint.task_type);
      const modelId = getModelId(endpoint);
      if (modelId) {
        models.add(modelId);
      }
    });

    return {
      servicesCount: services.size,
      modelsCount: models.size,
      typesCount: types.size,
      endpointsCount: endpoints.length,
    };
  }, [endpoints]);

  const statItems: StatItemProps[] = [
    { label: SERVICES_LABEL, count: stats.servicesCount, testSubj: 'endpointStatsServicesCount' },
    { label: MODELS_LABEL, count: stats.modelsCount, testSubj: 'endpointStatsModelsCount' },
    {
      label: ENDPOINTS_LABEL,
      count: stats.endpointsCount,
      testSubj: 'endpointStatsEndpointsCount',
    },
    { label: TYPES_LABEL, count: stats.typesCount, testSubj: 'endpointStatsTypesCount' },
  ];

  return (
    <EuiFlexGroup
      gutterSize="m"
      alignItems="center"
      responsive={false}
      data-test-subj="endpointStats"
    >
      {statItems.map((item, index) => (
        <EuiFlexItem key={`stat-${index}`} grow={false} css={statItemStyles}>
          <StatItem label={item.label} count={item.count} testSubj={item.testSubj} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
