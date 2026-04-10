/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback, useMemo } from 'react';
import type { ScopedHistory } from '@kbn/core/public';
import { EuiEmptyPrompt, EuiPageTemplate, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Router } from '@kbn/shared-ux-router';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import type { Observable } from 'rxjs';
import type { IngestFlow } from './types';
import { IngestFlowCategory } from './components/ingest_flow_category';

interface IngestHubAppProps {
  ingestFlows$: Observable<IngestFlow[]>;
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

export const IngestHubApp: React.FC<IngestHubAppProps> = ({ ingestFlows$, history }) => {
  const { services } = useKibana();
  const ingestFlows = useObservable(ingestFlows$, []);

  const categorizedFlows = useMemo(() => groupByCategory(ingestFlows), [ingestFlows]);

  const handleFlowClick = useCallback(
    (appId: string, path: string) => {
      services.application?.navigateToApp(appId, { path });
    },
    [services.application]
  );

  return (
    <Router history={history}>
      <EuiPageTemplate>
        <EuiPageTemplate.Header
          pageTitle={i18n.translate('xpack.ingestHub.pageTitle', {
            defaultMessage: 'Ingest Hub',
          })}
        />
        <EuiPageTemplate.Section>
          {ingestFlows.length === 0 ? (
            <EuiEmptyPrompt
              title={
                <h2>
                  {i18n.translate('xpack.ingestHub.emptyState.title', {
                    defaultMessage: 'No data sources available',
                  })}
                </h2>
              }
              body={i18n.translate('xpack.ingestHub.emptyState.body', {
                defaultMessage:
                  'No onboarding flows have been registered. Data source integrations will appear here when available.',
              })}
            />
          ) : (
            [...categorizedFlows.entries()].map(([category, flows]) => (
              <Fragment key={category}>
                <IngestFlowCategory
                  category={category}
                  flows={flows}
                  onFlowClick={handleFlowClick}
                />
                <EuiSpacer size="xl" />
              </Fragment>
            ))
          )}
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </Router>
  );
};
