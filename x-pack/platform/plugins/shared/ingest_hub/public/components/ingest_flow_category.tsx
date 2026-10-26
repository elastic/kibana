/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { sortBy } from 'lodash';
import { EuiFlexGrid, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import type { IngestFlow } from '../types';
import { IngestFlowTile } from './ingest_flow_tile';

interface IngestFlowCategoryProps {
  category: string;
  flows: IngestFlow[];
  onFlowClick: (flowId: string) => void;
}

export const IngestFlowCategory: React.FC<IngestFlowCategoryProps> = ({
  category,
  flows,
  onFlowClick,
}) => {
  const sortedFlows = sortBy(flows, (f) => f.order ?? 0);

  return (
    <div>
      <EuiTitle size="s">
        <h2>{category}</h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFlexGrid columns={3} gutterSize="m">
        {sortedFlows.map((flow) => (
          <EuiFlexItem key={flow.id}>
            <IngestFlowTile flow={flow} onClick={() => onFlowClick(flow.id)} />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </div>
  );
};
