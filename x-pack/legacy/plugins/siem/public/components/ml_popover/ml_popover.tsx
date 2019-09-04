/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiPopover, EuiPopoverTitle, EuiSpacer } from '@elastic/eui';
import React, { useContext, useEffect, useReducer, useState } from 'react';
import styled from 'styled-components';
import moment from 'moment';

import { useJobSummaryData } from './hooks/use_job_summary_data';
import * as i18n from './translations';
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
import {
  getConfigTemplatesToInstall,
  getIndexPatternTitles,
  getJobsToDisplay,
  getJobsToInstall,
  getStablePatternTitles,
} from './helpers';
import { configTemplates } from './config_templates';
import { useStateToaster } from '../toasters';
import { errorToToaster } from '../ml/api/error_to_toaster';
import { useKibanaUiSetting } from '../../lib/settings/use_kibana_ui_setting';
import { DEFAULT_KBN_VERSION } from '../../../common/constants';
import { METRIC_TYPE, TELEMETRY_EVENT, trackUiAction as track } from '../../lib/track_usage';

const PopoverContentsDiv = styled.div`
  max-width: 550px;
`;

PopoverContentsDiv.displayName = 'PopoverContentsDiv';

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
  const [{ refreshToggle }, dispatch] = useReducer(mlPopoverReducer, initialState);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [showCustomJobs, setShowCustomJobs] = useState(false);
  const [showElasticJobs, setShowElasticJobs] = useState(false);
  const [isLoadingJobSummaryData, jobSummaryData] = useJobSummaryData([], refreshToggle);
  const [isCreatingJobs, setIsCreatingJobs] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [, dispatchToaster] = useStateToaster();
  const [, configuredIndexPatterns] = useIndexPatterns(refreshToggle);
  const capabilities = useContext(MlCapabilitiesContext);
  const [kbnVersion] = useKibanaUiSetting(DEFAULT_KBN_VERSION);
  const headers = { 'kbn-version': kbnVersion };

  const configuredIndexPatternTitles = getIndexPatternTitles(configuredIndexPatterns);

  // Enable/Disable Job & Datafeed -- passed to JobsTable for use as callback on JobSwitch
  const enableDatafeed = async (jobName: string, latestTimestampMs: number, enable: boolean) => {
    submitTelemetry(jobName, enable, embeddedJobIds);

    // Max start time for job is no more than two weeks ago to ensure job performance
    const maxStartTime = moment
      .utc()
      .subtract(14, 'days')
      .valueOf();

    if (enable) {
      const startTime = Math.max(latestTimestampMs, maxStartTime);
      try {
        await startDatafeeds([`datafeed-${jobName}`], headers, startTime);
      } catch (error) {
        track(METRIC_TYPE.COUNT, TELEMETRY_EVENT.JOB_ENABLE_FAILURE);
        errorToToaster({ title: i18n.START_JOB_FAILURE, error, dispatchToaster });
      }
    } else {
      try {
        await stopDatafeeds([`datafeed-${jobName}`], headers);
      } catch (error) {
        track(METRIC_TYPE.COUNT, TELEMETRY_EVENT.JOB_DISABLE_FAILURE);
        errorToToaster({ title: i18n.STOP_JOB_FAILURE, error, dispatchToaster });
      }
    }
    dispatch({ type: 'refresh' });
  };

  // All jobs from embedded configTemplates that should be installed
  const embeddedJobIds = getJobsToInstall(configTemplates);

  // Jobs currently installed retrieved via ml jobs_summary api for 'siem' group
  const siemGroupJobIds = jobSummaryData != null ? jobSummaryData.map(job => job.id) : [];
  const installedJobIds = embeddedJobIds.filter(job => siemGroupJobIds.includes(job));

  // Config templates that still need to be installed and have a defaultIndexPattern that is configured
  const configTemplatesToInstall = getConfigTemplatesToInstall(
    configTemplates,
    installedJobIds,
    configuredIndexPatternTitles || []
  );

  // Filter installed job to show all 'siem' group jobs or just embedded
  const jobsToDisplay = getJobsToDisplay(
    jobSummaryData,
    embeddedJobIds,
    showCustomJobs,
    showElasticJobs,
    filterQuery
  );

  // Install Config Templates as effect of opening popover
  useEffect(() => {
    if (
      jobSummaryData != null &&
      configuredIndexPatternTitles.length > 0 &&
      configTemplatesToInstall.length > 0
    ) {
      const setupJobs = async () => {
        setIsCreatingJobs(true);
        try {
          await Promise.all(
            configTemplatesToInstall.map(configTemplate => {
              return setupMlJob({
                configTemplate: configTemplate.name,
                indexPatternName: configTemplate.defaultIndexPattern,
                groups: ['siem'],
                headers,
              });
            })
          );
          setIsCreatingJobs(false);
          dispatch({ type: 'refresh' });
        } catch (error) {
          errorToToaster({ title: i18n.CREATE_JOB_FAILURE, error, dispatchToaster });
          setIsCreatingJobs(false);
        }
      };
      setupJobs();
    }
  }, [jobSummaryData, getStablePatternTitles(configuredIndexPatternTitles)]);

  if (!capabilities.isPlatinumOrTrialLicense) {
    // If the user does not have platinum show upgrade UI
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
  } else if (hasMlAdminPermissions(capabilities)) {
    // If the user has Platinum License & ML Admin Permissions, show Anomaly Detection button & full config UI
    return (
      <EuiPopover
        anchorPosition="downRight"
        id="integrations-popover"
        button={
          <EuiButton
            data-test-subj="integrations-button"
            iconType="arrowDown"
            iconSide="right"
            onClick={() => {
              setIsPopoverOpen(!isPopoverOpen);
              dispatch({ type: 'refresh' });
            }}
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

          <EuiSpacer />

          <FilterGroup
            showCustomJobs={showCustomJobs}
            setShowCustomJobs={setShowCustomJobs}
            showElasticJobs={showElasticJobs}
            setShowElasticJobs={setShowElasticJobs}
            setFilterQuery={setFilterQuery}
          />

          <ShowingCount filterResultsLength={jobsToDisplay.length} />

          <EuiSpacer />

          <JobsTable
            isLoading={isCreatingJobs || isLoadingJobSummaryData}
            jobs={jobsToDisplay}
            onJobStateChange={enableDatafeed}
          />
        </PopoverContentsDiv>
      </EuiPopover>
    );
  } else {
    // If the user has Platinum License & not ML Admin, hide Anomaly Detection button as they don't have permissions to configure
    return null;
  }
});

const submitTelemetry = (jobName: string, enabled: boolean, embeddedJobIds: string[]) => {
  // Report type of job enabled/disabled
  track(
    METRIC_TYPE.COUNT,
    embeddedJobIds.includes(jobName)
      ? enabled
        ? TELEMETRY_EVENT.SIEM_JOB_ENABLED
        : TELEMETRY_EVENT.SIEM_JOB_DISABLED
      : enabled
      ? TELEMETRY_EVENT.CUSTOM_JOB_ENABLED
      : TELEMETRY_EVENT.CUSTOM_JOB_DISABLED
  );
};

MlPopover.displayName = 'MlPopover';
