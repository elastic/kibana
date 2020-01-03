/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import d3 from 'd3';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSwitch,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { toastNotifications } from 'ui/notify';

import { Dictionary } from '../../../../common/types/common';
import { MlJobWithTimeRange } from '../../../../common/types/jobs';
import { ml } from '../../services/ml_api_service';
import { useUrlState } from '../../util/url_state';
// @ts-ignore
import { JobSelectorTable } from './job_selector_table';
// @ts-ignore
import { IdBadges } from './id_badges';
// @ts-ignore
import { NewSelectionIdBadges } from './new_selection_id_badges';
import { getGroupsFromJobs, normalizeTimes } from './job_select_service_utils';

interface GroupObj {
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

  groupObjs.forEach(group => {
    selectedIds.push(group.groupId);
    alreadySelected.push(...group.jobIds);
  });

  jobIds.forEach(jobId => {
    // Add jobId if not already included in group selection
    if (alreadySelected.includes(jobId) === false) {
      selectedIds.push(jobId);
    }
  });

  return selectedIds;
}

type GroupsMap = Dictionary<string[]>;
function getInitialGroupsMap(selectedGroups: GroupObj[]): GroupsMap {
  const map: GroupsMap = {};

  if (selectedGroups.length) {
    selectedGroups.forEach(group => {
      map[group.groupId] = group.jobIds;
    });
  }

  return map;
}

const BADGE_LIMIT = 10;
const DEFAULT_GANTT_BAR_WIDTH = 299; // pixels

interface JobSelectorProps {
  dateFormatTz: string;
  singleSelection: boolean;
  timeseriesOnly: boolean;
}

export function JobSelector({ dateFormatTz, singleSelection, timeseriesOnly }: JobSelectorProps) {
  const [globalState, setGlobalState] = useUrlState('_g');

  const selectedJobIds = globalState?.ml?.jobIds || [];
  const selectedGroups = globalState?.ml?.groups || [];

  const [jobs, setJobs] = useState<MlJobWithTimeRange[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [maps, setMaps] = useState({ groupsMap: getInitialGroupsMap(selectedGroups), jobsMap: {} });
  const [selectedIds, setSelectedIds] = useState(
    mergeSelection(selectedJobIds, selectedGroups, singleSelection)
  );
  const [newSelection, setNewSelection] = useState(
    mergeSelection(selectedJobIds, selectedGroups, singleSelection)
  );
  const [showAllBadges, setShowAllBadges] = useState(false);
  const [showAllBarBadges, setShowAllBarBadges] = useState(false);
  const [applyTimeRange, setApplyTimeRange] = useState(true);
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const [ganttBarWidth, setGanttBarWidth] = useState(DEFAULT_GANTT_BAR_WIDTH);
  const flyoutEl = useRef<{ flyout: HTMLElement }>(null);

  // Ensure JobSelectionBar gets updated when selection via globalState changes.
  useEffect(() => {
    setSelectedIds(mergeSelection(selectedJobIds, selectedGroups, singleSelection));
  }, [JSON.stringify([selectedJobIds, selectedGroups])]);

  // Ensure current selected ids always show up in flyout
  useEffect(() => {
    setNewSelection(selectedIds);
  }, [isFlyoutVisible]); // eslint-disable-line

  // Wrap handleResize in useCallback as it is a dependency for useEffect on line 131 below.
  // Not wrapping it would cause this dependency to change on every render
  const handleResize = useCallback(() => {
    if (jobs.length > 0 && flyoutEl && flyoutEl.current && flyoutEl.current.flyout) {
      // get all cols in flyout table
      const tableHeaderCols: NodeListOf<HTMLElement> = flyoutEl.current.flyout.querySelectorAll(
        'table thead th'
      );
      // get the width of the last col
      const derivedWidth = tableHeaderCols[tableHeaderCols.length - 1].offsetWidth - 16;
      const normalizedJobs = normalizeTimes(jobs, dateFormatTz, derivedWidth);
      setJobs(normalizedJobs);
      const { groups: updatedGroups } = getGroupsFromJobs(normalizedJobs);
      setGroups(updatedGroups);
      setGanttBarWidth(derivedWidth);
    }
  }, [dateFormatTz, jobs]);

  useEffect(() => {
    // Ensure ganttBar width gets calculated on resize
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  useEffect(() => {
    handleResize();
  }, [handleResize, jobs]);

  function closeFlyout() {
    setIsFlyoutVisible(false);
  }

  function showFlyout() {
    setIsFlyoutVisible(true);
  }

  function handleJobSelectionClick() {
    showFlyout();

    ml.jobs
      .jobsWithTimerange(dateFormatTz)
      .then(resp => {
        const normalizedJobs = normalizeTimes(resp.jobs, dateFormatTz, DEFAULT_GANTT_BAR_WIDTH);
        const { groups: groupsWithTimerange, groupsMap } = getGroupsFromJobs(normalizedJobs);
        setJobs(normalizedJobs);
        setGroups(groupsWithTimerange);
        setMaps({ groupsMap, jobsMap: resp.jobsMap });
      })
      .catch((err: any) => {
        console.log('Error fetching jobs', err); // eslint-disable-line
        toastNotifications.addDanger({
          title: i18n.translate('xpack.ml.jobSelector.jobFetchErrorMessage', {
            defaultMessage: 'An error occurred fetching jobs. Refresh and try again.',
          }),
        });
      });
  }

  function handleNewSelection({ selectionFromTable }: { selectionFromTable: any }) {
    setNewSelection(selectionFromTable);
  }

  function applySelection() {
    // allNewSelection will be a list of all job ids (including those from groups) selected from the table
    const allNewSelection: string[] = [];
    const groupSelection: Array<{ groupId: string; jobIds: string[] }> = [];

    newSelection.forEach(id => {
      if (maps.groupsMap[id] !== undefined) {
        // Push all jobs from selected groups into the newSelection list
        allNewSelection.push(...maps.groupsMap[id]);
        // if it's a group - push group obj to set in global state
        groupSelection.push({ groupId: id, jobIds: maps.groupsMap[id] });
      } else {
        allNewSelection.push(id);
      }
    });
    // create a Set to remove duplicate values
    const allNewSelectionUnique = Array.from(new Set(allNewSelection));

    setSelectedIds(newSelection);
    setNewSelection([]);

    closeFlyout();

    const time = applyTimeRange ? getTimeRangeFromSelection(allNewSelectionUnique) : undefined;

    setGlobalState({
      ml: {
        jobIds: allNewSelectionUnique,
        groups: groupSelection,
      },
      ...(time !== undefined ? { time } : {}),
    });
  }

  function getTimeRangeFromSelection(selection: string[]) {
    if (jobs.length > 0) {
      const times: number[] = [];
      jobs.forEach(job => {
        if (selection.includes(job.job_id)) {
          if (job.timeRange.from !== undefined) {
            times.push(job.timeRange.from);
          }
          if (job.timeRange.to !== undefined) {
            times.push(job.timeRange.to);
          }
        }
      });
      if (times.length) {
        const extent = d3.extent(times);
        const selectedTime = {
          from: moment(extent[0]).toISOString(),
          to: moment(extent[1]).toISOString(),
        };
        return selectedTime;
      }
    }
  }

  function toggleTimerangeSwitch() {
    setApplyTimeRange(!applyTimeRange);
  }

  function removeId(id: string) {
    setNewSelection(newSelection.filter(item => item !== id));
  }

  function clearSelection() {
    setNewSelection([]);
  }

  function renderJobSelectionBar() {
    return (
      <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            wrap
            responsive={false}
            gutterSize="xs"
            alignItems="center"
            data-test-subj="mlJobSelectionBadges"
          >
            <IdBadges
              limit={BADGE_LIMIT}
              maps={maps}
              onLinkClick={() => setShowAllBarBadges(!showAllBarBadges)}
              selectedIds={selectedIds}
              showAllBarBadges={showAllBarBadges}
            />
          </EuiFlexGroup>
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
      </EuiFlexGroup>
    );
  }

  function renderFlyout() {
    if (isFlyoutVisible) {
      return (
        <EuiFlyout
          // @ts-ignore
          ref={flyoutEl}
          onClose={closeFlyout}
          aria-labelledby="jobSelectorFlyout"
          size="l"
          data-test-subj="mlFlyoutJobSelector"
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2 id="flyoutTitle">
                {i18n.translate('xpack.ml.jobSelector.flyoutTitle', {
                  defaultMessage: 'Job selection',
                })}
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody className="mlJobSelectorFlyoutBody">
            <EuiFlexGroup direction="column" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup wrap responsive={false} gutterSize="xs" alignItems="center">
                  <NewSelectionIdBadges
                    limit={BADGE_LIMIT}
                    maps={maps}
                    newSelection={newSelection}
                    onDeleteClick={removeId}
                    onLinkClick={() => setShowAllBadges(!showAllBadges)}
                    showAllBadges={showAllBadges}
                  />
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup direction="row" justifyContent="spaceBetween" responsive={false}>
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
                  <EuiFlexItem grow={false}>
                    <EuiSwitch
                      label={i18n.translate('xpack.ml.jobSelector.applyTimerangeSwitchLabel', {
                        defaultMessage: 'Apply timerange',
                      })}
                      checked={applyTimeRange}
                      onChange={toggleTimerangeSwitch}
                      data-test-subj="mlFlyoutJobSelectorSwitchApplyTimeRange"
                    />
                  </EuiFlexItem>
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
            />
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
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
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="cross"
                  onClick={() => closeFlyout()}
                  data-test-subj="mlFlyoutJobSelectorButtonClose"
                >
                  {i18n.translate('xpack.ml.jobSelector.closeFlyoutButton', {
                    defaultMessage: 'Close',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      );
    }
  }

  return (
    <div className="mlJobSelectorBar">
      {selectedIds.length > 0 && renderJobSelectionBar()}
      {renderFlyout()}
    </div>
  );
}

JobSelector.propTypes = {
  selectedJobIds: PropTypes.array,
  singleSelection: PropTypes.bool,
  timeseriesOnly: PropTypes.bool,
};
