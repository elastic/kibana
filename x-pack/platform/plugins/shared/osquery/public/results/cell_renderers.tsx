/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { isArray, isObject } from 'lodash/fp';
import type { CustomCellRenderer, DataGridCellValueElementProps } from '@kbn/unified-data-table';
import { getNestedOrFlat } from './transform_results';

interface GetOsqueryCellRenderersOptions {
  getFleetAppUrl: (agentId: string) => string;
  ecsMappingColumns: string[];
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  if (isArray(value) || isObject(value)) {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

const AgentNameRenderer: React.FC<
  DataGridCellValueElementProps & { getFleetAppUrl: (agentId: string) => string }
> = ({ row, getFleetAppUrl }) => {
  const agentId = row.flattened['agent.id'];
  const agentName = row.flattened['agent.name'];

  if (!agentId || !agentName) {
    return <>{formatValue(agentName)}</>;
  }

  return <EuiLink href={getFleetAppUrl(String(agentId))}>{String(agentName)}</EuiLink>;
};

AgentNameRenderer.displayName = 'AgentNameRenderer';

const EcsMappingRenderer: React.FC<DataGridCellValueElementProps & { columnId: string }> = ({
  row,
  columnId,
}) => {
  const source = row.raw._source;
  const value = getNestedOrFlat(columnId, source);

  return <>{formatValue(value)}</>;
};

EcsMappingRenderer.displayName = 'EcsMappingRenderer';

export function getOsqueryCellRenderers({
  getFleetAppUrl,
  ecsMappingColumns,
}: GetOsqueryCellRenderersOptions): CustomCellRenderer {
  const renderers: CustomCellRenderer = {
    'agent.name': (props) => <AgentNameRenderer {...props} getFleetAppUrl={getFleetAppUrl} />,
  };

  for (const column of ecsMappingColumns) {
    renderers[column] = (props) => <EcsMappingRenderer {...props} columnId={column} />;
  }

  return renderers;
}
