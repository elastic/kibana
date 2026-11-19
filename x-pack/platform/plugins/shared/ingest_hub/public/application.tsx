/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback, useMemo, useState } from 'react';
import type { ScopedHistory } from '@kbn/core/public';
import { EuiPageTemplate, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Router } from '@kbn/shared-ux-router';
import type { IngestFlow } from './types';
import { IngestFlowCategory } from './components/ingest_flow_category';
import { IngestFlowFlyout } from './components/ingest_flow_flyout';

interface IngestHubAppProps {
  ingestFlows: IngestFlow[];
  history: ScopedHistory;
}

const groupByCategory = (flows: IngestFlow[]): Map<string, IngestFlow[]> => {
  const grouped = new Map<string, IngestFlow[]>();
  for (const flow of flows) {
    const existing = grouped.get(flow.category) ?? [];
    existing.push(flow);
    grouped.set(flow.category, existing);
  }
  return grouped;
};

export const IngestHubApp: React.FC<IngestHubAppProps> = ({ ingestFlows, history }) => {
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);

  const categorizedFlows = useMemo(() => groupByCategory(ingestFlows), [ingestFlows]);

  const selectedFlow = useMemo(
    () => ingestFlows.find((flow) => flow.id === selectedFlowId) ?? null,
    [ingestFlows, selectedFlowId]
  );

  const handleCloseFlyout = useCallback(() => {
    setSelectedFlowId(null);
  }, []);

  return (
    <Router history={history}>
      <EuiPageTemplate>
        <EuiPageTemplate.Header
          pageTitle={i18n.translate('xpack.ingestHub.pageTitle', {
            defaultMessage: 'Ingest Hub',
          })}
        />
        <EuiPageTemplate.Section>
          {[...categorizedFlows.entries()].map(([category, flows]) => (
            <Fragment key={category}>
              <IngestFlowCategory
                category={category}
                flows={flows}
                onFlowClick={setSelectedFlowId}
              />
              <EuiSpacer size="xl" />
            </Fragment>
          ))}
        </EuiPageTemplate.Section>

        {selectedFlow && <IngestFlowFlyout flow={selectedFlow} onClose={handleCloseFlyout} />}
      </EuiPageTemplate>
    </Router>
  );
};
