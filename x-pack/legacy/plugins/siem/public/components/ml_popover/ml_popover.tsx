/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect, useReducer, useState } from 'react';

import styled from 'styled-components';
import moment from 'moment';
import { EuiButton, EuiPopover, EuiPopoverTitle, EuiSpacer } from '@elastic/eui';
import { useJobSummaryData } from './hooks/use_job_summary_data';
import * as i18n from './translations';
import { KibanaConfigContext } from '../../lib/adapters/framework/kibana_framework_adapter';
import { Job } from './types';
import { hasMlAdminPermissions } from '../ml/permissions/has_ml_admin_permissions';
import { MlCapabilitiesContext } from '../ml/permissions/ml_capabilities_provider';
import { JobsTable } from './jobs_table/jobs_table';
import { setupMlJob, startDatafeeds, stopDatafeeds } from './api';
import { useIndexPatterns } from './hooks/use_index_patterns';
import { UpgradeContents } from './upgrade_contents';
import { FilterGroup } from './jobs_table/filter_group';
import { ShowingCount } from './jobs_table/showing_count';
import { PopoverDescription } from './popover_description';
import { getConfigTemplatesToInstall, getJobsToDisplay, getJobsToInstall } from './helpers';
import { configTemplates, siemJobPrefix } from './config_templates';

const PopoverContentsDiv = styled.div`
  width: 550px;
`;

interface State {
  isLoading: boolean;
  jobs: Job[];
  refreshToggle: boolean;
}

type Action =
  | { type: 'refresh' }
  | { type: 'loading' }
  | { type: 'success'; results: Job[] }
  | { type: 'failure' };

function mlPopoverReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'refresh': {
      return {
        ...state,
        refreshToggle: !state.refreshToggle,
      };
    }
    case 'loading': {
      return {
        ...state,
        isLoading: true,
      };
    }
    case 'success': {
      return {
        ...state,
        isLoading: false,
        jobs: action.results,
      };
    }
    case 'failure': {
      return {
        ...state,
        isLoading: false,
        jobs: [],
      };
    }
    default:
      return state;
  }
}

const initialState: State = {
  isLoading: false,
  jobs: [],
  refreshToggle: true,
};

export const MlPopover = React.memo(() => {
  // Hooks/State
  const [{ refreshToggle }, dispatch] = useReducer(mlPopoverReducer, initialState);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [showAllJobs, setShowAllJobs] = useState(false);
  const [isLoadingJobSummaryData, jobSummaryData] = useJobSummaryData([], refreshToggle);
  const [isCreatingJobs, setIsCreatingJobs] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  const [isLoadingConfiguredIndexPatterns, configuredIndexPattern] = useIndexPatterns();
  const config = useContext(KibanaConfigContext);
  const capabilities = useContext(MlCapabilitiesContext);
  const headers = { 'kbn-version': config.kbnVersion };

  // Enable/Disable Job & Datafeed
  const enableDatafeed = async (jobName: string, latestTimestampMs: number, enable: boolean) => {
    // Max start time for job is no more than two weeks ago to ensure job performance
    const maxStartTime = moment
      .utc()
      .subtract(14, 'days')
      .valueOf();

    if (enable) {
      const startTime = Math.max(latestTimestampMs, maxStartTime);
      await startDatafeeds([`datafeed-${jobName}`], headers, startTime);
    } else {
      await stopDatafeeds([`datafeed-${jobName}`], headers);
    }
    dispatch({ type: 'refresh' });
  };

  // All jobs from embedded configTemplates that should be installed
  const embeddedJobIds = getJobsToInstall(configTemplates);

  // Jobs currently installed retrieved via ml jobs_summary api for 'siem' group
  const siemJobs = jobSummaryData.map(job => job.id);
  const installedJobIds = embeddedJobIds.filter(job => siemJobs.includes(job));

  // Config templates that still need to be installed and have a defaultIndexPattern that is configured
  const configTemplatesToInstall = getConfigTemplatesToInstall(
    configTemplates,
    installedJobIds,
    configuredIndexPattern || ''
  );

  // Install Config Templates as effect of opening popover
  useEffect(() => {
    if (
      !isLoadingJobSummaryData &&
      !isLoadingConfiguredIndexPatterns &&
      configTemplatesToInstall.length > 0
    ) {
      const setupJobs = async () => {
        setIsCreatingJobs(true);
        await Promise.all(
          configTemplatesToInstall.map(configTemplate => {
            return setupMlJob({
              configTemplate: configTemplate.name,
              indexPatternName: configTemplate.defaultIndexPattern,
              groups: ['siem'],
              prefix: siemJobPrefix,
              headers,
            });
          })
        );
        setIsCreatingJobs(false);
        dispatch({ type: 'refresh' });
      };
      setupJobs();
    }
  }, [configTemplatesToInstall.length]);

  // Filter installed job to show all 'siem' group jobs or just embedded
  const jobsToDisplay = getJobsToDisplay(jobSummaryData, embeddedJobIds, showAllJobs, filterQuery);
  if (!hasMlAdminPermissions(capabilities)) {
    return (
      <EuiPopover
        anchorPosition="downRight"
        id="integrations-popover"
        button={
          <EuiButton
            data-test-subj="integrations-button"
            iconType="arrowDown"
            iconSide="right"
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          >
            {i18n.ANOMALY_DETECTION}
          </EuiButton>
        }
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(!isPopoverOpen)}
      >
        <UpgradeContents />
      </EuiPopover>
    );
  } else {
    return (
      <EuiPopover
        anchorPosition="downRight"
        id="integrations-popover"
        button={
          <EuiButton
            data-test-subj="integrations-button"
            iconType="arrowDown"
            iconSide="right"
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          >
            {i18n.ANOMALY_DETECTION}
          </EuiButton>
        }
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(!isPopoverOpen)}
      >
        <PopoverContentsDiv data-test-subj="ml-popover-contents">
          <EuiPopoverTitle>{i18n.ANOMALY_DETECTION_TITLE}</EuiPopoverTitle>
          <PopoverDescription />

          <EuiSpacer size="m" />

          <FilterGroup
            showAllJobs={showAllJobs}
            setShowAllJobs={setShowAllJobs}
            setFilterQuery={setFilterQuery}
          />

          <ShowingCount filterResultsLength={jobsToDisplay.length} />

          <EuiSpacer size="s" />

          <JobsTable
            isLoading={isCreatingJobs || isLoadingJobSummaryData}
            jobs={jobsToDisplay}
            onJobStateChange={enableDatafeed}
          />
        </PopoverContentsDiv>
      </EuiPopover>
    );
  }
});
