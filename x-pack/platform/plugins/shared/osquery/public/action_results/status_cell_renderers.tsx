/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock, EuiLink, EuiToolTip } from '@elastic/eui';
import type { CustomCellRenderer, DataGridCellValueElementProps } from '@kbn/unified-data-table';

interface GetStatusCellRenderersOptions {
  getFleetAppUrl: (agentId: string) => string;
}

export const getStatusCellRenderers = ({
  getFleetAppUrl,
}: GetStatusCellRenderersOptions): CustomCellRenderer => ({
  agent_id: (props: DataGridCellValueElementProps) => {
    const agentName = props.row.flattened.agent_id as string;
    const rawAgentId = props.row.flattened._raw_agent_id as string;

    if (!rawAgentId) {
      return <>{agentName || '-'}</>;
    }

    return (
      <EuiToolTip position="top" content={<p>{rawAgentId}</p>}>
        <EuiLink className="eui-textTruncate" href={getFleetAppUrl(rawAgentId)} target="_blank">
          {agentName}
        </EuiLink>
      </EuiToolTip>
    );
  },
  'action_response.osquery.count': (props: DataGridCellValueElementProps) => {
    const count = props.row.flattened['action_response.osquery.count'];

    return <>{count != null ? String(count) : '-'}</>;
  },
  error: (props: DataGridCellValueElementProps) => {
    const errorValue = props.row.flattened.error as string;

    if (!errorValue) {
      return <>-</>;
    }

    return (
      <EuiCodeBlock language="shell" fontSize="s" paddingSize="none" transparentBackground>
        {errorValue}
      </EuiCodeBlock>
    );
  },
});
