/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect, useState } from 'react';

import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButton,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPopover,
  EuiPopoverTitle,
  // @ts-ignore no-exported-member
  EuiSearchBar,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { useJobSummaryData } from './hooks/use_job_summary_data';
import * as i18n from './translations';
import { KibanaConfigContext } from '../../lib/adapters/framework/kibana_framework_adapter';
import { ConfigTemplate, Job } from './types';
import { hasMlAdminPermissions } from '../ml/permissions/has_ml_admin_permissions';
import { MlCapabilitiesContext } from '../ml/permissions/ml_capabilities_provider';
import { EuiSearchBarQuery } from '../open_timeline/types';
import { JobSwitchProps } from './job_switch';
import { JobsTable } from './jobs_table';
import { setupMlJob } from './api';
import { useIndexPatterns } from './hooks/use_index_patterns';
import { UpgradePopoverContents } from './upgrade_popover';

const PopoverContentsDiv = styled.div`
  width: 550px;
`;

const ShowingContainer = styled.div`
  user-select: none;
  margin-top: 5px;
`;

const siemJobPrefix = 'siem-api-';

/**
 * Config Templates w/ corresponding defaultIndexPattern and jobId's of the SIEM Jobs embedded
 * in ML. Added as part of: https://github.com/elastic/kibana/pull/39678/files
 */
const configTemplates: ConfigTemplate[] = [
  {
    name: 'siem_auditbeat_ecs',
    defaultIndexPattern: 'auditbeat-*',
    jobs: [
      `${siemJobPrefix}rare_process_linux_ecs`,
      `${siemJobPrefix}suspicious_login_activity_ecs`,
    ],
  },
  {
    name: 'siem_winlogbeat_ecs',
    defaultIndexPattern: 'winlogbeat-*',
    jobs: [`${siemJobPrefix}rare_process_windows_ecs`],
  },
];

export const getJobsToInstall = (templates: ConfigTemplate[]): string[] =>
  templates.reduce((jobs: string[], template) => [...jobs, ...template.jobs], []);

export const getConfigTemplatesToInstall = (
  templates: ConfigTemplate[],
  installedJobIds: string[],
  indexPattern: string
): ConfigTemplate[] =>
  templates
    .filter(ct => !ct.jobs.every(ctJobId => installedJobIds.includes(ctJobId)))
    .filter(ct => indexPattern.indexOf(ct.defaultIndexPattern) >= 0);

export const getJobsToDisplay = (
  siemJobSummaryData: Job[] | null,
  embeddedJobIds: string[],
  showAllJobs: boolean,
  filterQuery?: string
): Job[] =>
  siemJobSummaryData
    ? searchFilter(
        siemJobSummaryData.filter(job => (showAllJobs ? true : embeddedJobIds.includes(job.id))),
        filterQuery
      )
    : [];

export const searchFilter = (jobs: Job[], filterQuery?: string): Job[] =>
  jobs.filter(job =>
    filterQuery == null
      ? true
      : job.id.includes(filterQuery) || job.description.includes(filterQuery)
  );

export const MlPopover = React.memo(() => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [showAllJobs, setShowAllJobs] = useState(false);
  const [isCreatingJobs, setIsCreatingJobs] = useState(false);
  const [refetchSummaryData, setRefetchSummaryData] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  const [isLoadingJobSummaryData, siemJobSummaryData] = useJobSummaryData(
    [],
    isPopoverOpen ? !refetchSummaryData : refetchSummaryData
  );
  const [isLoadingConfiguredIndexPatterns, configuredIndexPattern] = useIndexPatterns();
  const config = useContext(KibanaConfigContext);
  const capabilities = useContext(MlCapabilitiesContext);
  const headers = { 'kbn-version': config.kbnVersion };

  // All jobs from embedded configTemplates that should be installed
  const embeddedJobIds = getJobsToInstall(configTemplates);

  // Jobs currently installed retrieved via ml jobs_summary api for 'siem' group
  const siemJobs = siemJobSummaryData.map(job => job.id);
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
        setRefetchSummaryData(!refetchSummaryData);
      };
      setupJobs();
    }
  }, [configTemplatesToInstall.length]);

  // Filter installed job to show all 'siem' group jobs or just embedded
  const jobsToDisplay = getJobsToDisplay(
    siemJobSummaryData,
    embeddedJobIds,
    showAllJobs,
    filterQuery
  );
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
        <UpgradePopoverContents />
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
          <MlPopoverDescription />

          <EuiSpacer size="m" />

          <EuiFlexGroup gutterSize="m" justifyContent="flexEnd">
            <EuiFlexItem grow={true}>
              <EuiSearchBar
                data-test-subj="jobs-filter-bar"
                box={{
                  placeholder: i18n.FILTER_PLACEHOLDER,
                  incremental: true,
                }}
                onChange={(query: EuiSearchBarQuery) => setFilterQuery(query.queryText.trim())}
              />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiFilterGroup>
                <EuiFilterButton
                  hasActiveFilters={!showAllJobs}
                  onClick={() => setShowAllJobs(false)}
                  data-test-subj="show-custom-jobs-filter-button"
                >
                  {i18n.SHOW_ALL_JOBS}
                </EuiFilterButton>
                <EuiFilterButton
                  hasActiveFilters={showAllJobs}
                  onClick={() => setShowAllJobs(true)}
                  data-test-subj="show-elastic-jobs-filter-button"
                >
                  {i18n.SHOW_SIEM_JOBS}
                </EuiFilterButton>
              </EuiFilterGroup>
            </EuiFlexItem>
          </EuiFlexGroup>

          <ShowingContainer data-test-subj="showing">
            <EuiText color="subdued" size="xs">
              <FormattedMessage
                data-test-subj="query-message"
                id="xpack.siem.components.mlPopup.showingLabel"
                defaultMessage="Showing: {filterResultsLength} {filterResultsLength, plural, one {Job} other {Jobs}}"
                values={{
                  filterResultsLength: jobsToDisplay.length,
                }}
              />
            </EuiText>
          </ShowingContainer>

          <EuiSpacer size="s" />

          <JobsTable
            items={jobsToDisplay.map(
              (dp): JobSwitchProps => ({
                jobName: dp.id,
                jobDescription: dp.description,
                datafeedState: dp.datafeedState,
                latestTimestampMs: dp.latestTimestampMs || 0,
                onJobStateChange: () => setRefetchSummaryData(!refetchSummaryData),
              })
            )}
            isLoading={isCreatingJobs || isLoadingJobSummaryData}
          />
        </PopoverContentsDiv>
      </EuiPopover>
    );
  }
});

export const MlPopoverDescription = React.memo(() => (
  <EuiText size="s">
    <FormattedMessage
      id="xpack.siem.components.mlPopup.anomalyDetectionDescription"
      defaultMessage="Run any of the Machine Learning jobs below to view anomalous events throughout the SIEM application. We’ve provided a few common detection jobs to get you started. If you wish to add your own custom jobs, simply create and tag them with “SIEM” from the {machineLearning} application for inclusion here."
      values={{
        machineLearning: (
          <EuiLink href="/app/ml" target="blank">
            <FormattedMessage
              id="xpack.siem.components.mlPopup.machineLearningLink"
              defaultMessage="Machine Learning"
            />
          </EuiLink>
        ),
      }}
    />
  </EuiText>
));
