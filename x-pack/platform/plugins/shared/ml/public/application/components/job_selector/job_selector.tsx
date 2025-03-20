/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';

import { EuiButtonEmpty, EuiFlexItem, EuiFlexGroup, EuiHorizontalRule } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import './_index.scss';

import { ML_PAGES } from '../../../locator';
import type { Dictionary } from '../../../../common/types/common';
import { IdBadges } from './id_badges';

import { BADGE_LIMIT } from './job_selector_flyout';
import type {
  MlJobWithTimeRange,
  MlSummaryJob,
} from '../../../../common/types/anomaly_detection_jobs';
import { FeedBackButton } from '../feedback_button';
import { JobInfoFlyoutsProvider } from '../../jobs/components/job_details_flyout';
import { JobInfoFlyoutsManager } from '../../jobs/components/job_details_flyout/job_details_context_manager';
import { useJobSelectionFlyout } from '../../contexts/ml/use_job_selection_flyout';

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
  const [selectedIds, setSelectedIds] = useState(
    mergeSelection(selectedJobIds, selectedGroups, singleSelection)
  );

  const [showAllBarBadges, setShowAllBarBadges] = useState(false);

  const openJobSelectionFlyout = useJobSelectionFlyout();

  // Ensure JobSelectionBar gets updated when selection via globalState changes.
  useEffect(() => {
    setSelectedIds(mergeSelection(selectedJobIds, selectedGroups, singleSelection));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify([selectedJobIds, selectedGroups])]);

  const handleJobSelectionClick = useCallback(async () => {
    try {
      const result = await openJobSelectionFlyout({
        singleSelection,
        withTimeRangeSelector: true,
        timeseriesOnly,
        selectedIds,
      });

      if (result) {
        const { newSelection, jobIds, time } = result;
        setSelectedIds(newSelection);
        onSelectionChange?.({ jobIds, time });
      }
    } catch {
      // Flyout closed without selection
    }
  }, [onSelectionChange, openJobSelectionFlyout, selectedIds, singleSelection, timeseriesOnly]);

  const page = useMemo(() => {
    return singleSelection ? ML_PAGES.SINGLE_METRIC_VIEWER : ML_PAGES.ANOMALY_EXPLORER;
  }, [singleSelection]);

  const removeJobId = (jobOrGroupId: string[]) => {
    const newSelection = selectedIds.filter((id) => !jobOrGroupId.includes(id));
    setSelectedIds(newSelection);
    onSelectionChange?.({ jobIds: newSelection, time: undefined });
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

  return (
    <div>
      <JobInfoFlyoutsProvider>
        {renderJobSelectionBar()}
        <JobInfoFlyoutsManager />
      </JobInfoFlyoutsProvider>
    </div>
  );
}
