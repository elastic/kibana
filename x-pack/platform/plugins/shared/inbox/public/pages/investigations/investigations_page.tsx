/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageSection,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { useInvestigations } from '../../hooks/use_investigations_api';
import type { Investigation } from '../../../common/investigations';
import { InboxWatchesNav } from '../watches/components/inbox_watches_nav';
import { InvestigationRow } from './investigation_row';
import { InvestigationDetailFlyout } from './investigation_detail';
import {
  INVESTIGATION_BUCKETS,
  groupInvestigationsByBucket,
  type InvestigationBucketId,
} from './bucket_utils';

export const InvestigationsPage: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { data, isLoading, error, refetch } = useInvestigations();
  const [selectedInvestigation, setSelectedInvestigation] = useState<Investigation | null>(null);

  const grouped = useMemo(
    () => groupInvestigationsByBucket(data?.investigations ?? []),
    [data?.investigations]
  );

  const totalCount = data?.investigations.length ?? 0;

  return (
    <EuiPageSection paddingSize="l" css={{ paddingTop: euiTheme.size.l }}>
      <InboxWatchesNav active="investigations" />
      <EuiSpacer size="m" />
      <EuiTitle size="l">
        <h1>Investigations</h1>
      </EuiTitle>
      <EuiText color="subdued" size="s">
        <p>
          Daybreak triage queue — investigations materialized from Watch runs, grouped by severity
          bucket (client-side).
        </p>
      </EuiText>
      <EuiSpacer size="l" />

      {isLoading && !data ? (
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}

      {error ? (
        <EuiEmptyPrompt
          iconType="error"
          color="danger"
          title={<h2>Failed to load investigations</h2>}
          body={<p>Could not fetch the investigations queue.</p>}
          actions={
            <EuiButton onClick={() => refetch()} fill>
              Retry
            </EuiButton>
          }
        />
      ) : null}

      {data ? (
        <>
          <EuiText size="s" color="subdued">
            <p>
              {totalCount} investigation{totalCount === 1 ? '' : 's'} · server-side severity filter
              unavailable (POC client-side grouping)
            </p>
          </EuiText>
          <EuiSpacer size="m" />

          {totalCount === 0 ? (
            <EuiEmptyPrompt
              iconType="inspect"
              title={<h2>No investigations yet</h2>}
              body={<p>Run Watch Floor to materialize a conversation, then refresh this page.</p>}
            />
          ) : (
            INVESTIGATION_BUCKETS.map((bucket) => {
              const rows = grouped[bucket.id as InvestigationBucketId];
              if (rows.length === 0) {
                return null;
              }

              return (
                <div key={bucket.id}>
                  <EuiPanel
                    hasBorder
                    paddingSize="m"
                    css={css`
                      border-left: 4px solid
                        ${bucket.accentColor === 'danger'
                          ? euiTheme.colors.danger
                          : bucket.accentColor === 'warning'
                          ? euiTheme.colors.warning
                          : bucket.accentColor === 'primary'
                          ? euiTheme.colors.primary
                          : euiTheme.colors.vis.euiColorVis6};
                    `}
                  >
                    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiTitle size="m">
                          <span
                            css={css`
                              font-size: ${euiTheme.size.xxxl};
                              font-weight: ${euiTheme.font.weight.bold};
                              line-height: 1;
                            `}
                          >
                            {rows.length}
                          </span>
                        </EuiTitle>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiBadge color={bucket.accentColor}>{bucket.label}</EuiBadge>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText size="xs" color="subdued">
                          {bucket.id === 'contain'
                            ? 'Critical / high severity'
                            : bucket.id === 'escalate'
                            ? 'Medium severity'
                            : bucket.id === 'investigate'
                            ? 'Low severity'
                            : 'Inconclusive / false positive'}
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    <EuiSpacer size="m" />
                    <EuiFlexGroup direction="column" gutterSize="s">
                      {rows.map((investigation) => (
                        <EuiFlexItem key={investigation.conversation_id}>
                          <InvestigationRow
                            investigation={investigation}
                            onSelect={setSelectedInvestigation}
                          />
                        </EuiFlexItem>
                      ))}
                    </EuiFlexGroup>
                  </EuiPanel>
                  <EuiSpacer size="l" />
                </div>
              );
            })
          )}
        </>
      ) : null}

      {selectedInvestigation ? (
        <InvestigationDetailFlyout
          investigation={selectedInvestigation}
          onClose={() => setSelectedInvestigation(null)}
        />
      ) : null}
    </EuiPageSection>
  );
};
