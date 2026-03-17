/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiPageTemplate, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import type { IngestFlowRegistration } from './types';
import { IngestFlowCategory } from './components/ingest_flow_category';
import { IngestFlowFlyout } from './components/ingest_flow_flyout';

interface IngestHubAppProps {
  coreStart: CoreStart;
  ingestFlows: IngestFlowRegistration[];
}

const groupByCategory = (
  flows: IngestFlowRegistration[]
): Map<string, IngestFlowRegistration[]> => {
  const grouped = new Map<string, IngestFlowRegistration[]>();
  for (const flow of flows) {
    const existing = grouped.get(flow.category) ?? [];
    existing.push(flow);
    grouped.set(flow.category, existing);
  }
  return grouped;
};

export const IngestHubApp: React.FC<IngestHubAppProps> = ({ ingestFlows }) => {
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
    <EuiPageTemplate>
      <EuiPageTemplate.Header>
        <EuiTitle size="l">
          <h1>
            {i18n.translate('xpack.ingestHub.pageTitle', {
              defaultMessage: 'Ingest Hub',
            })}
          </h1>
        </EuiTitle>
      </EuiPageTemplate.Header>
      <EuiPageTemplate.Section>
        {[...categorizedFlows.entries()].map(([category, flows]) => (
          <React.Fragment key={category}>
            <IngestFlowCategory category={category} flows={flows} onFlowClick={setSelectedFlowId} />
            <EuiSpacer size="xl" />
          </React.Fragment>
        ))}
      </EuiPageTemplate.Section>

      {selectedFlow && <IngestFlowFlyout flow={selectedFlow} onClose={handleCloseFlyout} />}
    </EuiPageTemplate>
  );
};
