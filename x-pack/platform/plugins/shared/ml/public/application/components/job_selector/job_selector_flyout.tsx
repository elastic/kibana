/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSwitch,
  EuiTitle,
  EuiResizeObserver,
  EuiProgress,
} from '@elastic/eui';
import { NewSelectionIdBadges } from './new_selection_id_badges';
// @ts-ignore
import { JobSelectorTable } from './job_selector_table';
import {
  getGroupsFromJobs,
  getTimeRangeFromSelection,
  normalizeTimes,
} from './job_select_service_utils';
import type {
  MlJobTimeRange,
  MlJobWithTimeRange,
} from '../../../../common/types/anomaly_detection_jobs';
import { useMlKibana } from '../../contexts/kibana';
import type { JobSelectionMaps } from './job_selector';

export const BADGE_LIMIT = 10;
export const DEFAULT_GANTT_BAR_WIDTH = 299; // pixels

export interface JobSelectionResult {
  newSelection: string[];
  jobIds: string[];
  time?: { from: string; to: string } | undefined;
}

export interface JobSelectorFlyoutProps {
  dateFormatTz: string;
  selectedIds?: string[];
  newSelection?: string[];
  onFlyoutClose: () => void;
  onJobsFetched?: (maps: JobSelectionMaps) => void;
  onSelectionConfirmed: (payload: JobSelectionResult) => void;
  singleSelection: boolean;
  timeseriesOnly: boolean;
  withTimeRangeSelector?: boolean;
  applyTimeRangeConfig?: boolean;
  onTimeRangeConfigChange?: (v: boolean) => void;
}

export interface MlJobGroupWithTimeRange {
  id: string;
  jobIds: string[];
  timeRange: MlJobTimeRange;
}

export const JobSelectorFlyoutContent: FC<JobSelectorFlyoutProps> = ({
  dateFormatTz,
  selectedIds = [],
  singleSelection,
  timeseriesOnly,
  onJobsFetched,
  onSelectionConfirmed,
  onFlyoutClose,
  applyTimeRangeConfig,
  onTimeRangeConfigChange,
  withTimeRangeSelector = true,
}) => {
  const {
    services: {
      notifications,
      mlServices: { mlApi },
    },
  } = useMlKibana();

  const [newSelection, setNewSelection] = useState(selectedIds);

  const [isLoading, setIsLoading] = useState(true);
  const [showAllBadges, setShowAllBadges] = useState(false);
  const [jobs, setJobs] = useState<MlJobWithTimeRange[]>([]);
  const [groups, setGroups] = useState<MlJobGroupWithTimeRange[]>([]);

  const [ganttBarWidth, setGanttBarWidth] = useState(DEFAULT_GANTT_BAR_WIDTH);

  const flyoutEl = useRef<HTMLElement | null>(null);

  const applySelection = useCallback(() => {
    const selectedGroupIds = newSelection.filter((id) => groups.some((group) => group.id === id));

    const jobsInSelectedGroups = [
      ...new Set(
        groups
          .filter((group) => selectedGroupIds.includes(group.id))
          .flatMap((group) => group.jobIds)
      ),
    ];

    const standaloneJobs = newSelection.filter(
      (id) => !selectedGroupIds.includes(id) && !jobsInSelectedGroups.includes(id)
    );

    const finalSelection = [...selectedGroupIds, ...standaloneJobs];
    const time = applyTimeRangeConfig ? getTimeRangeFromSelection(jobs, finalSelection) : undefined;

    onSelectionConfirmed({
      newSelection: finalSelection,
      jobIds: finalSelection,
      time,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSelectionConfirmed, newSelection, applyTimeRangeConfig]);

  function removeId(id: string) {
    setNewSelection(newSelection.filter((item) => item !== id));
  }

  function toggleTimerangeSwitch() {
    if (onTimeRangeConfigChange) {
      onTimeRangeConfigChange(!applyTimeRangeConfig);
    }
  }

  function clearSelection() {
    setNewSelection([]);
  }

  function handleNewSelection({ selectionFromTable }: { selectionFromTable: any }) {
    setNewSelection(selectionFromTable);
  }

  // Wrap handleResize in useCallback as it is a dependency for useEffect on line 131 below.
  // Not wrapping it would cause this dependency to change on every render
  const handleResize = useCallback(() => {
    if (jobs.length === 0 || !flyoutEl.current) return;

    // get all cols in flyout table
    const tableHeaderCols: NodeListOf<HTMLElement> =
      flyoutEl.current.querySelectorAll('table thead th');
    // get the width of the last col
    const derivedWidth = tableHeaderCols[tableHeaderCols.length - 1].offsetWidth - 16;
    const normalizedJobs = normalizeTimes(jobs, dateFormatTz, derivedWidth);
    setJobs(normalizedJobs);
    const { groups: updatedGroups } = getGroupsFromJobs(normalizedJobs);
    setGroups(updatedGroups);
    setGanttBarWidth(derivedWidth);
  }, [dateFormatTz, jobs]);

  // Fetch jobs list on flyout open
  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchJobs() {
    try {
      const resp = await mlApi.jobs.jobsWithTimerange(dateFormatTz);
      const normalizedJobs = normalizeTimes(resp.jobs, dateFormatTz, DEFAULT_GANTT_BAR_WIDTH);
      const { groups: groupsWithTimerange, groupsMap } = getGroupsFromJobs(normalizedJobs);
      setJobs(normalizedJobs);
      setGroups(groupsWithTimerange);

      if (onJobsFetched) {
        onJobsFetched({ groupsMap, jobsMap: resp.jobsMap });
      }
    } catch (e) {
      console.error('Error fetching jobs with time range', e); // eslint-disable-line no-console
      const { toasts } = notifications;
      toasts.addDanger({
        title: i18n.translate('xpack.ml.jobSelector.jobFetchErrorMessage', {
          defaultMessage: 'An error occurred fetching jobs. Refresh and try again.',
        }),
      });
    }
    setIsLoading(false);
  }

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="flyoutTitle">
            {i18n.translate('xpack.ml.jobSelector.flyoutTitle', {
              defaultMessage: 'Job selection',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody className="mlJobSelectorFlyoutBody" data-test-subj={'mlJobSelectorFlyoutBody'}>
        <EuiResizeObserver onResize={handleResize}>
          {(resizeRef) => (
            <div
              ref={(e) => {
                flyoutEl.current = e;
                resizeRef(e);
              }}
            >
              {isLoading ? (
                <EuiProgress size="xs" color="accent" />
              ) : (
                <>
                  <EuiFlexGroup direction="column" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiFlexGroup wrap responsive={false} gutterSize="xs" alignItems="center">
                        <NewSelectionIdBadges
                          limit={BADGE_LIMIT}
                          groups={groups}
                          newSelection={newSelection}
                          onDeleteClick={removeId}
                          onLinkClick={() => setShowAllBadges(!showAllBadges)}
                          showAllBadges={showAllBadges}
                        />
                      </EuiFlexGroup>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiFlexGroup
                        direction="row"
                        justifyContent="spaceBetween"
                        responsive={false}
                      >
                        <EuiFlexItem grow={false}>
                          {!singleSelection && newSelection.length > 0 && (
                            <EuiButtonEmpty
                              onClick={clearSelection}
                              size="xs"
                              data-test-subj="mlFlyoutJobSelectorButtonClearSelection"
                            >
                              {i18n.translate('xpack.ml.jobSelector.clearAllFlyoutButton', {
                                defaultMessage: 'Clear all',
                              })}
                            </EuiButtonEmpty>
                          )}
                        </EuiFlexItem>
                        {withTimeRangeSelector &&
                        applyTimeRangeConfig !== undefined &&
                        jobs.length !== 0 ? (
                          <EuiFlexItem grow={false}>
                            <EuiSwitch
                              label={i18n.translate(
                                'xpack.ml.jobSelector.applyTimerangeSwitchLabel',
                                {
                                  defaultMessage: 'Apply time range',
                                }
                              )}
                              checked={applyTimeRangeConfig}
                              onChange={toggleTimerangeSwitch}
                              data-test-subj="mlFlyoutJobSelectorSwitchApplyTimeRange"
                            />
                          </EuiFlexItem>
                        ) : null}
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <JobSelectorTable
                    jobs={jobs}
                    ganttBarWidth={ganttBarWidth}
                    groupsList={groups}
                    onSelection={handleNewSelection}
                    selectedIds={newSelection}
                    singleSelection={singleSelection}
                    timeseriesOnly={timeseriesOnly}
                    withTimeRangeSelector={withTimeRangeSelector}
                  />
                </>
              )}
            </div>
          )}
        </EuiResizeObserver>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              onClick={onFlyoutClose}
              data-test-subj="mlFlyoutJobSelectorButtonClose"
            >
              {i18n.translate('xpack.ml.jobSelector.closeFlyoutButton', {
                defaultMessage: 'Close',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {jobs.length !== 0 ? (
              <EuiButton
                onClick={applySelection}
                fill
                isDisabled={newSelection.length === 0}
                data-test-subj="mlFlyoutJobSelectorButtonApply"
              >
                {i18n.translate('xpack.ml.jobSelector.applyFlyoutButton', {
                  defaultMessage: 'Apply',
                })}
              </EuiButton>
            ) : null}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
