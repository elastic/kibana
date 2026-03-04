/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiStat, EuiLoadingSpinner, EuiPanel } from '@elastic/eui';
import { css } from '@emotion/react';
import type { CaseStatuses } from '../../../common/types/domain';
import { statuses } from './config';

export interface Props {
  caseCount: number | null;
  caseStatus: CaseStatuses;
  isLoading: boolean;
  dataTestSubj?: string;
}

const StatusStatsComponent: React.FC<Props> = ({
  caseCount,
  caseStatus,
  isLoading,
  dataTestSubj,
}) => {
  const { title, description } = useMemo(
    () => ({
      description: statuses[caseStatus].stats.title,
      title: isLoading ? (
        <EuiLoadingSpinner data-test-subj={`${dataTestSubj}-loading-spinner`} />
      ) : (
        caseCount ?? '-'
      ),
    }),
    [caseCount, caseStatus, dataTestSubj, isLoading]
  );
  return (
    <EuiPanel hasBorder paddingSize="m" grow={false}>
      <EuiStat
        data-test-subj={dataTestSubj}
        description={description}
        title={title}
        titleSize="xs"
        text-align="left"
      />
  </EuiPanel>
  );
};

StatusStatsComponent.displayName = 'StatusStats';
export const StatusStats = memo(StatusStatsComponent);
