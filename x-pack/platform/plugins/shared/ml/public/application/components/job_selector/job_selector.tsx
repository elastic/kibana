/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';

import {
  EuiButtonEmpty,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFlyout,
  EuiHorizontalRule,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import './_index.scss';

import { useStorage } from '@kbn/ml-local-storage';
import { ML_PAGES } from '../../../locator';
import type { Dictionary } from '../../../../common/types/common';
import { IdBadges } from './id_badges';
import type { JobSelectorFlyoutProps } from './job_selector_flyout';
import { BADGE_LIMIT, JobSelectorFlyoutContent } from './job_selector_flyout';
import type {
  MlJobWithTimeRange,
  MlSummaryJob,
} from '../../../../common/types/anomaly_detection_jobs';
import { ML_APPLY_TIME_RANGE_CONFIG } from '../../../../common/types/storage';
import { FeedBackButton } from '../feedback_button';
import { JobInfoFlyoutsProvider } from '../../jobs/components/job_details_flyout';
import { JobInfoFlyoutsManager } from '../../jobs/components/job_details_flyout/job_details_context_manager';

export interface GroupObj {
  groupId: string;
  jobIds: string[];
}

function mergeSelection(
  jobIds: string[],
  groupObjs: GroupObj[],
  singleSelection: boolean
): string[] {
  if (singleSelection) {
    return jobIds;
  }

  const selectedIds: string[] = [];
  const alreadySelected: string[] = [];

  groupObjs.forEach((group) => {
    selectedIds.push(group.groupId);
    alreadySelected.push(...group.jobIds);
  });

  jobIds.forEach((jobId) => {
    // Add jobId if not already included in group selection
    if (alreadySelected.includes(jobId) === false) {
      selectedIds.push(jobId);
    }
  });

  return selectedIds;
}

type GroupsMap = Dictionary<string[]>;
export function getInitialGroupsMap(selectedGroups: GroupObj[]): GroupsMap {
  const map: GroupsMap = {};

  if (selectedGroups.length) {
    selectedGroups.forEach((group) => {
      map[group.groupId] = group.jobIds;
    });
  }

  return map;
}

export interface JobSelectorProps {
  dateFormatTz: string;
  singleSelection: boolean;
  timeseriesOnly: boolean;
  onSelectionChange?: ({
    jobIds,
    time,
  }: {
    jobIds: string[];
    time?: { from: string; to: string };
  }) => void;
  selectedJobIds?: string[];
  selectedGroups?: GroupObj[];
  selectedJobs?: MlSummaryJob[];
}

export interface JobSelectionMaps {
  jobsMap: Dictionary<MlJobWithTimeRange>;
  groupsMap: Dictionary<string[]>;
}

export function JobSelector({
  dateFormatTz,
  singleSelection,
  timeseriesOnly,
  selectedJobIds = [],
  selectedGroups = [],
  selectedJobs = [],
  onSelectionChange,
}: JobSelectorProps) {
  const [applyTimeRangeConfig, setApplyTimeRangeConfig] = useStorage(
    ML_APPLY_TIME_RANGE_CONFIG,
    true
  );

  const [selectedIds, setSelectedIds] = useState(
    mergeSelection(selectedJobIds, selectedGroups, singleSelection)
  );

  const [showAllBarBadges, setShowAllBarBadges] = useState(false);
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);

  // Ensure JobSelectionBar gets updated when selection via globalState changes.
  useEffect(() => {
    setSelectedIds(mergeSelection(selectedJobIds, selectedGroups, singleSelection));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify([selectedJobIds, selectedGroups])]);

  function closeFlyout() {
    setIsFlyoutVisible(false);
  }

  function showFlyout() {
    setIsFlyoutVisible(true);
  }

  function handleJobSelectionClick() {
    showFlyout();
  }

  const applySelection: JobSelectorFlyoutProps['onSelectionConfirmed'] = useCallback(
    ({ newSelection, jobIds, time }) => {
      setSelectedIds(newSelection);

      onSelectionChange?.({ jobIds, time });
      closeFlyout();
    },
    [onSelectionChange]
  );

  const page = useMemo(() => {
    return singleSelection ? ML_PAGES.SINGLE_METRIC_VIEWER : ML_PAGES.ANOMALY_EXPLORER;
  }, [singleSelection]);

  const removeJobId = (jobOrGroupId: string[]) => {
    const newSelection = selectedIds.filter((id) => !jobOrGroupId.includes(id));
    applySelection({ newSelection, jobIds: newSelection, time: undefined });
  };
  function renderJobSelectionBar() {
    return (
      <>
        <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
          <EuiFlexItem grow={false}>
            {selectedIds.length > 0 ? (
              <EuiFlexGroup
                wrap
                responsive={false}
                gutterSize="xs"
                alignItems="center"
                data-test-subj="mlJobSelectionBadges"
              >
                <IdBadges
                  limit={BADGE_LIMIT}
                  onLinkClick={() => setShowAllBarBadges(!showAllBarBadges)}
                  selectedJobIds={selectedJobIds}
                  selectedGroups={selectedGroups}
                  selectedJobs={selectedJobs}
                  showAllBarBadges={showAllBarBadges}
                  page={page}
                  onRemoveJobId={removeJobId}
                />
              </EuiFlexGroup>
            ) : (
              <span>
                <FormattedMessage
                  id="xpack.ml.jobSelector.noJobsSelectedLabel"
                  defaultMessage="No jobs selected"
                />
              </span>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              iconType="pencil"
              onClick={handleJobSelectionClick}
              data-test-subj="mlButtonEditJobSelection"
            >
              {i18n.translate('xpack.ml.jobSelector.jobSelectionButton', {
                defaultMessage: 'Edit job selection',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem />

          <EuiFlexItem grow={false}>
            <FeedBackButton jobIds={selectedIds} page={page} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="s" />
      </>
    );
  }

  function renderFlyout() {
    if (isFlyoutVisible) {
      return (
        <EuiFlyout
          onClose={closeFlyout}
          data-test-subj="mlFlyoutJobSelector"
          aria-labelledby="jobSelectorFlyout"
        >
          <JobSelectorFlyoutContent
            dateFormatTz={dateFormatTz}
            timeseriesOnly={timeseriesOnly}
            singleSelection={singleSelection}
            selectedIds={selectedIds}
            onSelectionConfirmed={applySelection}
            onFlyoutClose={closeFlyout}
            applyTimeRangeConfig={applyTimeRangeConfig}
            onTimeRangeConfigChange={setApplyTimeRangeConfig}
          />
        </EuiFlyout>
      );
    }
  }

  return (
    <div>
      <JobInfoFlyoutsProvider>
        {renderJobSelectionBar()}
        {renderFlyout()}
        <JobInfoFlyoutsManager />
      </JobInfoFlyoutsProvider>
    </div>
  );
}
