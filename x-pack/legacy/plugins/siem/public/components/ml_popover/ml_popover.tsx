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

const FilterJobsEuiFlexGroup = styled(EuiFlexGroup)`
  margin-top: -20px;
`;

/**
 * Config Templates w/ corresponding defaultIndexPattern and jobId's of the SIEM Jobs embedded
 * in ML. Added as part of: https://github.com/elastic/kibana/pull/39678/files
 */
const configTemplates = [
  // {
  //   name: 'siem_auditbeat_ecs',
  //   defaultIndexPattern: 'auditbeat-*',
  //   jobs: ['rare_process_linux_ecs', 'suspicious_login_activity_ecs'],
  // },
  // {
  //   name: 'siem_winlogbeat_ecs',
  //   defaultIndexPattern: 'winlogbeat-*',
  //   jobs: ['rare_process_windows_ecs'],
  // },
  // TODO: Test ConfigTemplate -- remove once above PR makes it across the line
  {
    name: 'auditbeat_process_hosts_ecs',
    defaultIndexPattern: 'auditbeat-*',
    jobs: [
      'siem-api-test-hosts_high_count_process_events_ecs',
      'siem-api-test-hosts_rare_process_activity_ecs',
    ],
  },
];

export const MlPopover = React.memo(() => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [showAllJobs, setShowAllJobs] = useState(false);
  const [refetchSummaryData, setRefetchSummaryData] = useState(false);
  const [, siemJobs] = useSiemJobs(isPopoverOpen);
  const [, siemJobSummaryData] = useJobSummaryData(siemJobs, refetchSummaryData);
  const config = useContext(KibanaConfigContext);

  // All jobs from embedded configTemplates that should be installed
  const embeddedJobIds = configTemplates.reduce(
    (jobs: string[], configTemplate) => [...jobs, ...configTemplate.jobs],
    []
  );

  // Jobs currently installed retrieved via ml groups api for 'siem' group
  const installedJobIds = embeddedJobIds.filter(job => siemJobs.includes(job));

  // Config templates that still need to be installed and have a defaultIndexPattern that is configured
  const configTemplatesToInstall = configTemplates
    .filter(ct => !ct.jobs.every(ctJobId => installedJobIds.includes(ctJobId)))
    .filter(ct => config.indexPattern && config.indexPattern.indexOf(ct.defaultIndexPattern) >= 0);

  // Filter installed job to show all 'siem' group jobs or just embedded
  const jobsToDisplay = siemJobSummaryData
    ? siemJobSummaryData
        .filter(job => (showAllJobs ? true : embeddedJobIds.includes(job.id)))
        .map(job => ({
          title: job.id,
          description: job.description,
          isChecked: job.datafeedState === 'started',
        }))
    : [];

  return (
    <EuiPopover
      id="popover"
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
      <div style={{ width: '450px' }}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiDescriptionList
              listItems={[
                {
                  title: (
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
                  ),
                  description: i18n.ML_DESCRIPTION,
                },
              ]}
            />
          </EuiFlexItem>
          {configTemplatesToInstall.length > 0 && (
            <EuiFlexItem>
              <EuiButton
                iconType="plusInCircle"
                onClick={async () => {
                  await Promise.all(
                    configTemplatesToInstall.map(configTemplate => {
                      return setupMlJob({
                        configTemplate: configTemplate.name,
                        indexPatternName: configTemplate.defaultIndexPattern,
                        groups: ['siem'],
                      });
                    })
                  );
                  setRefetchSummaryData(!refetchSummaryData);
                }}
              >
                {i18n.CREATE_JOBS}
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        <EuiSpacer size="xs" />

        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiToolTip content={i18n.JOB_DETAILS_TOOL_TIP} position="left">
              <EuiTitle size="xs">
                <h4>{i18n.JOB_DETAILS}</h4>
              </EuiTitle>
            </EuiToolTip>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiHorizontalRule margin="m" />
          </EuiFlexItem>
        </EuiFlexGroup>

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
      </div>
    </EuiPopover>
  );
});

const JobDetail = React.memo<{
  jobName: string;
  jobDescription: string;
  isChecked: boolean;
  onJobStateChange: Function;
}>(({ jobName, jobDescription, isChecked, onJobStateChange }) => {
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
          checked={isChecked}
          onChange={async e => {
            if (e.target.checked) {
              await startDatafeeds([`datafeed-${jobName}`]);
            } else {
              await stopDatafeeds([`datafeed-${jobName}`]);
            }
            onJobStateChange();
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
