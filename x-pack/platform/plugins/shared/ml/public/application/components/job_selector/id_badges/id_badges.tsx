/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { GroupSelectorMenu } from '../group_or_job_selector_menu/group_selector_menu';
import type { GroupObj } from '../job_selector';
import { AnomalyDetectionInfoButton } from '../group_or_job_selector_menu/job_selector_button';
import type { MlPages } from '../../../../../common/constants/locator';
import type { MlSummaryJob } from '../../../../../common/types/anomaly_detection_jobs';
import type { ExplorerJob } from '../../../explorer/explorer_utils';

export interface IdBadgesProps {
  limit: number;
  selectedGroups: GroupObj[];
  selectedJobIds: string[];
  onLinkClick: () => void;
  showAllBarBadges: boolean;
  page: MlPages;
  onRemoveJobId: (jobOrGroupId: string[]) => void;
  selectedJobs: MlSummaryJob[] | ExplorerJob[];
}

export function IdBadges({
  limit,
  selectedGroups,
  onLinkClick,
  selectedJobIds,
  showAllBarBadges,
  page,
  onRemoveJobId,
  selectedJobs,
}: IdBadgesProps) {
  const badges = [];
  const singleMetricViewerDisabledIds: string[] = useMemo(
    () => selectedJobs.filter((job) => !job.isSingleMetricViewerJob).map((job) => job.id),
    [selectedJobs]
  );
  // Create group badges. Skip job ids here.
  for (let i = 0; i < selectedGroups.length; i++) {
    const currentGroup = selectedGroups[i];
    badges.push(
      <EuiFlexItem grow={false} key={currentGroup.groupId}>
        <GroupSelectorMenu
          groupId={currentGroup.groupId}
          jobIds={currentGroup.jobIds}
          page={page}
          onRemoveJobId={onRemoveJobId}
          removeJobIdDisabled={selectedJobIds.length < 2}
          removeGroupDisabled={
            selectedGroups.length < 2 && selectedJobIds.length <= currentGroup.jobIds.length
          }
          singleMetricViewerDisabledIds={singleMetricViewerDisabledIds}
        />
      </EuiFlexItem>
    );
  }
  // Create badges for jobs with no groups
  for (let i = 0; i < selectedJobIds.length; i++) {
    const currentId = selectedJobIds[i];
    if (selectedGroups.some((g) => g.jobIds.includes(currentId))) {
      continue;
    }
    badges.push(
      <EuiFlexItem grow={false} key={currentId}>
        <AnomalyDetectionInfoButton
          jobId={currentId}
          page={page}
          onRemoveJobId={onRemoveJobId}
          removeJobIdDisabled={selectedJobIds.length < 2}
          isSingleMetricViewerDisabled={singleMetricViewerDisabledIds.includes(currentId)}
        />
      </EuiFlexItem>
    );
  }

  if (showAllBarBadges || badges.length <= limit) {
    if (badges.length > limit) {
      badges.push(
        <EuiLink key="more-badges-bar-link" onClick={onLinkClick}>
          <EuiText grow={false} size="xs">
            {i18n.translate('xpack.ml.jobSelector.hideBarBadges', {
              defaultMessage: 'Hide',
            })}
          </EuiText>
        </EuiLink>
      );
    }

    return <>{badges}</>;
  } else {
    const overFlow = badges.length - limit;

    badges.splice(limit);
    badges.push(
      <EuiLink key="more-badges-bar-link" onClick={onLinkClick}>
        <EuiText grow={false} size="xs">
          {i18n.translate('xpack.ml.jobSelector.showBarBadges', {
            defaultMessage: `And {overFlow} more`,
            values: { overFlow },
          })}
        </EuiText>
      </EuiLink>
    );

    return <>{badges}</>;
  }
}
