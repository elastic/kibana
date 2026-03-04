/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiStat,
  EuiPanel,
} from '@elastic/eui';
import { css } from '@emotion/react';
import prettyMilliseconds from 'pretty-ms';
import { CaseStatuses } from '../../../common/types/domain';
import { StatusStats } from '../status/status_stats';
import { useGetCasesMetrics } from '../../containers/use_get_cases_metrics';
import { ATTC_DESCRIPTION, ATTC_STAT, ATTC_STAT_INFO_ARIA_LABEL } from './translations';

export const CasesMetrics: React.FC = () => {
  const { data: { mttr, status } = { mttr: 0 }, isLoading: isCasesMetricsLoading } =
    useGetCasesMetrics();

  const mttrValue = useMemo(
    () => (mttr != null ? prettyMilliseconds(mttr * 1000, { compact: true, verbose: false }) : '-'),
    [mttr]
  );

  return (
    <>
      <EuiFlexGroup responsive={true} gutterSize="s" data-test-subj="cases-metrics-stats">
        <EuiFlexItem
          grow={true}
          css={css`
            max-width: 240px;
          `}
        >
          <StatusStats
            dataTestSubj="openStatsHeader"
            caseCount={status?.open ?? 0}
            caseStatus={CaseStatuses.open}
            isLoading={isCasesMetricsLoading}
          />
        </EuiFlexItem>
        <EuiFlexItem
          grow={true}
          css={css`
            max-width: 240px;
          `}
        >
          <StatusStats
            dataTestSubj="inProgressStatsHeader"
            caseCount={status?.inProgress ?? 0}
            caseStatus={CaseStatuses['in-progress']}
            isLoading={isCasesMetricsLoading}
          />
        </EuiFlexItem>
        <EuiFlexItem
          grow={true}
          css={css`
            max-width: 240px;
          `}
        >
          <StatusStats
            dataTestSubj="closedStatsHeader"
            caseCount={status?.closed ?? 0}
            caseStatus={CaseStatuses.closed}
            isLoading={isCasesMetricsLoading}
          />
        </EuiFlexItem>
        <EuiFlexItem
          grow={true}
          css={css`
            max-width: 240px;
          `}
        >
          <EuiPanel
            hasBorder
            paddingSize="m"
            css={css`
              max-width: 240px;
            `}
            grow={false}
          >
            <EuiStat
              data-test-subj={'mttrStatsHeader'}
              description={
                <>
                  {ATTC_STAT}
                  &nbsp;
                  <EuiIconTip
                    content={ATTC_DESCRIPTION}
                    position="right"
                    aria-label={ATTC_STAT_INFO_ARIA_LABEL}
                  />
                </>
              }
              title={
                isCasesMetricsLoading ? (
                  <EuiLoadingSpinner data-test-subj={`mttr-stat-loading-spinner`} />
                ) : (
                  mttrValue
                )
              }
              titleSize="xs"
              text-align="left"
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
    </>
  );
};
CasesMetrics.displayName = 'CasesMetrics';
