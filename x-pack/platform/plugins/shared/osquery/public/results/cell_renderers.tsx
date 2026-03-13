/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { isArray, isObject } from 'lodash/fp';
import { EuiLink } from '@elastic/eui';
import type { CustomCellRenderer } from '@kbn/unified-data-table';
import { getNestedOrFlat } from './transform_results';

export const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '-';
  }

  if (isArray(value) || isObject(value)) {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return '-';
    }
  }

  return String(value);
};

interface AgentNameRendererProps {
  row: { raw: { _source?: Record<string, unknown> }; flattened: Record<string, unknown> };
  getFleetAppUrl: (agentId: string) => string;
}

export const AgentNameRenderer: React.FC<AgentNameRendererProps> = ({ row, getFleetAppUrl }) => {
  const agentName = row.flattened['agent.name'];
  const agentId = row.flattened['agent.id'];
  const displayName = formatValue(agentName);

  if (!agentId) {
    return <>{displayName}</>;
  }

  return <EuiLink href={getFleetAppUrl(String(agentId))}>{displayName}</EuiLink>;
};

interface EcsMappingRendererProps {
  row: { raw: { _source?: Record<string, unknown> }; flattened: Record<string, unknown> };
  columnId: string;
}

export const EcsMappingRenderer: React.FC<EcsMappingRendererProps> = ({ row, columnId }) => {
  const source = (row.raw._source as Record<string, unknown>) ?? {};
  const value = getNestedOrFlat(columnId, source);

  return <>{formatValue(value)}</>;
};

interface GetOsqueryCellRenderersOptions {
  ecsMappingColumns: string[];
  getFleetAppUrl: (agentId: string) => string;
}

export const getOsqueryCellRenderers = ({
  ecsMappingColumns,
  getFleetAppUrl,
}: GetOsqueryCellRenderersOptions): CustomCellRenderer => {
  const renderers: CustomCellRenderer = {
    'agent.name': (props) => (
      <AgentNameRenderer row={props.row as any} getFleetAppUrl={getFleetAppUrl} />
    ),
  };

  for (const col of ecsMappingColumns) {
    renderers[col] = (props) => <EcsMappingRenderer row={props.row as any} columnId={col} />;
  }

  return renderers;
};
