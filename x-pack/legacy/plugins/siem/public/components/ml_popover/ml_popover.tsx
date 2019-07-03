/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPopover,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';

import styled from 'styled-components';
import { setupMlJob, startDatafeeds, stopDatafeeds } from './api';
import { useJobSummaryData } from './hooks/use_job_summary_data';
import { useSiemJobs } from './hooks/use_siem_jobs';
import * as i18n from './translations';
import { KibanaConfigContext } from '../../lib/adapters/framework/kibana_framework_adapter';
import { ConfigTemplate, DisplayJob, Job } from './types';
import { hasMlAdminPermissions } from '../ml/permissions/has_ml_admin_permissions';
import { MlCapabilitiesContext } from '../ml/permissions/ml_capabilities_provider';

const FilterJobsEuiFlexGroup = styled(EuiFlexGroup)`
  margin-top: -20px;
`;

const SpanH4 = styled.h4`
  display: inline-block;
`;

const PopoverContentsDiv = styled.div`
  width: 450px;
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
  showAllJobs: boolean
): DisplayJob[] =>
  siemJobSummaryData
    ? siemJobSummaryData
        .filter(job => (showAllJobs ? true : embeddedJobIds.includes(job.id)))
        .map(job => ({
          title: job.id,
          description: job.description,
          isChecked: job.datafeedState === 'started',
        }))
    : [];

export const MlPopover = React.memo(() => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [showAllJobs, setShowAllJobs] = useState(false);
  const [isCreatingJobs, setIsCreatingJobs] = useState(false);
  const [refetchSummaryData, setRefetchSummaryData] = useState(false);
  const [, siemJobs] = useSiemJobs(isPopoverOpen ? !refetchSummaryData : refetchSummaryData);
  const [, siemJobSummaryData] = useJobSummaryData(
    siemJobs,
    isPopoverOpen ? !refetchSummaryData : refetchSummaryData
  );
  const config = useContext(KibanaConfigContext);
  const capabilities = useContext(MlCapabilitiesContext);
  const headers = { 'kbn-version': config.kbnVersion };

  // All jobs from embedded configTemplates that should be installed
  const embeddedJobIds = getJobsToInstall(configTemplates);

  // Jobs currently installed retrieved via ml groups api for 'siem' group
  const installedJobIds = embeddedJobIds.filter(job => siemJobs.includes(job));

  // Config templates that still need to be installed and have a defaultIndexPattern that is configured
  const configTemplatesToInstall = getConfigTemplatesToInstall(
    configTemplates,
    installedJobIds,
    config.indexPattern || ''
  );

  // Filter installed job to show all 'siem' group jobs or just embedded
  const jobsToDisplay = getJobsToDisplay(siemJobSummaryData, embeddedJobIds, showAllJobs);
  if (!hasMlAdminPermissions(capabilities)) {
    return null;
  } else {
    return (
      <EuiPopover
        id="integrations-popover"
        button={
          <EuiButton
            data-test-subj="integrations-button"
            iconType="arrowDown"
            iconSide="right"
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          >
            {i18n.INTEGRATIONS}
          </EuiButton>
        }
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(!isPopoverOpen)}
      >
        <PopoverContentsDiv data-test-subj="ml-popover-contents">
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiDescriptionList
                listItems={[
                  {
                    title: <MlPopoverTitle />,
                    description: i18n.ML_DESCRIPTION,
                  },
                ]}
              />
            </EuiFlexItem>
            {configTemplatesToInstall.length > 0 && (
              <EuiFlexItem>
                <EuiButton
                  isLoading={isCreatingJobs}
                  iconType="plusInCircle"
                  onClick={async () => {
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
                    setRefetchSummaryData(!refetchSummaryData);
                    setIsCreatingJobs(false);
                  }}
                >
                  {isCreatingJobs ? i18n.CREATING_JOBS : i18n.CREATE_JOBS}
                </EuiButton>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>

          <EuiSpacer size="xs" />

          <JobDetailsHeader />

          <FilterJobsEuiFlexGroup gutterSize="xs" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="xs" onClick={() => setShowAllJobs(!showAllJobs)}>
                {showAllJobs ? i18n.SHOW_SIEM_JOBS : i18n.SHOW_ALL_JOBS}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </FilterJobsEuiFlexGroup>

          <EuiSpacer size="s" />

          {jobsToDisplay.map(job => (
            <JobDetail
              key={job.title}
              jobName={job.title}
              jobDescription={job.description}
              isChecked={job.isChecked}
              onJobStateChange={() => setRefetchSummaryData(!refetchSummaryData)}
            />
          ))}
        </PopoverContentsDiv>
      </EuiPopover>
    );
  }
});

export const JobDetail = React.memo<{
  jobName: string;
  jobDescription: string;
  isChecked: boolean;
  onJobStateChange: Function;
}>(({ jobName, jobDescription, isChecked, onJobStateChange }) => {
  const [isLoading, setIsLoading] = useState(false);
  const config = useContext(KibanaConfigContext);
  const headers = { 'kbn-version': config.kbnVersion };

  const startDatafeed = async (enable: boolean) => {
    if (enable) {
      await startDatafeeds([`datafeed-${jobName}`], headers);
    } else {
      await stopDatafeeds([`datafeed-${jobName}`], headers);
    }
    onJobStateChange();
    setIsLoading(false);
  };

  return (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxs">
          <h5>{jobName}</h5>
        </EuiTitle>
        <EuiText size="s">{jobDescription}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiSwitch
          data-test-subj="job-detail-switch"
          disabled={isLoading}
          checked={isChecked}
          onChange={e => {
            setIsLoading(true);
            startDatafeed(e.target.checked);
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

export const JobDetailsHeader = React.memo(() => (
  <EuiFlexGroup gutterSize="s" alignItems="center">
    <EuiFlexItem grow={false}>
      <EuiToolTip content={i18n.JOB_DETAILS_TOOL_TIP} position="left">
        <>
          <EuiTitle size="xs">
            <SpanH4>{i18n.JOB_DETAILS}</SpanH4>
          </EuiTitle>
          <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
        </>
      </EuiToolTip>
    </EuiFlexItem>

    <EuiFlexItem>
      <EuiHorizontalRule margin="m" />
    </EuiFlexItem>
  </EuiFlexGroup>
));

export const MlPopoverTitle = React.memo(() => (
  <EuiFlexGroup gutterSize="s" alignItems="center">
    <EuiFlexItem grow={false}>
      <EuiIcon type="machineLearningApp" size="m" />
    </EuiFlexItem>

    <EuiFlexItem>
      <EuiTitle size="s" className="euiAccordionForm__title">
        <h6>{i18n.MACHINE_LEARNING}</h6>
      </EuiTitle>
    </EuiFlexItem>
  </EuiFlexGroup>
));
