/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLoadingSpinner,
  EuiPanel,
  EuiStat,
  useEuiTheme,
} from '@elastic/eui';
import prettyMilliseconds from 'pretty-ms';
import { CaseStatuses } from '../../../../../common/types/domain';
import { StatusStats } from '../../../status/status_stats';
import { ATTC_DESCRIPTION, ATTC_STAT, ATTC_STAT_INFO_ARIA_LABEL } from '../translations';

const PRETTY_MS_OPTIONS = { compact: true, verbose: false } as const;
const MTTR_MULTIPLIER = 1000;

export interface CasesMetricsProps {
  /**
   * Counts and MTTR from the cases search response, so the stats bar reflects the same
   * search, filters, and date range as the table (https://github.com/elastic/security-team/issues/18001).
   */
  countOpenCases: number;
  countInProgressCases: number;
  countClosedCases: number;
  mttr: number | null | undefined;
  isLoading: boolean;
}

const CasesMetricsComponent: React.FC<CasesMetricsProps> = ({
  countOpenCases,
  countInProgressCases,
  countClosedCases,
  mttr,
  isLoading,
}) => {
  const { euiTheme } = useEuiTheme();

  const mttrValue = useMemo(
    () => (mttr != null ? prettyMilliseconds(mttr * MTTR_MULTIPLIER, PRETTY_MS_OPTIONS) : '-'),
    [mttr]
  );

  const panelStyles = useMemo(
    () => css`
      border-radius: ${euiTheme.border.radius.medium};
    `,
    [euiTheme.border.radius.medium]
  );

  return (
    <EuiPanel hasBorder paddingSize="m" grow={false} css={panelStyles}>
      <EuiFlexGroup responsive={true} data-test-subj="cases-metrics-stats">
        <EuiFlexItem grow={true}>
          <StatusStats
            dataTestSubj="openStatsHeader"
            caseCount={countOpenCases}
            caseStatus={CaseStatuses.open}
            isLoading={isLoading}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <StatusStats
            dataTestSubj="inProgressStatsHeader"
            caseCount={countInProgressCases}
            caseStatus={CaseStatuses['in-progress']}
            isLoading={isLoading}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <StatusStats
            dataTestSubj="closedStatsHeader"
            caseCount={countClosedCases}
            caseStatus={CaseStatuses.closed}
            isLoading={isLoading}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
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
              isLoading ? (
                <EuiLoadingSpinner data-test-subj={`mttr-stat-loading-spinner`} />
              ) : (
                mttrValue
              )
            }
            titleSize="xs"
            text-align="left"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
CasesMetricsComponent.displayName = 'CasesMetrics';

export const CasesMetrics = React.memo(CasesMetricsComponent);
