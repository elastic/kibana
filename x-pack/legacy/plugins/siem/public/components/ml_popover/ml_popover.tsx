/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FormEvent, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPopover,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useSiemJobs } from './hooks/use_siem_jobs';
import { setupMlJob, startDatafeeds, stopDatafeeds } from './api';

import * as i18n from './translations';
import { useJobSummaryData } from './hooks/use_job_summary_data';

/**
 * Config Templates w/ corresponding defaultIndexPattern and jobId's of the SIEM Jobs embedded
 * in ML. Added as part of: https://github.com/elastic/kibana/pull/39678/files
 */
const configTemplates = [
  {
    name: 'siem_auditbeat_ecs',
    defaultIndexPattern: 'auditbeat-*',
    jobs: ['rare_process_linux_ecs', 'suspicious_login_activity_ecs'],
  },
  {
    name: 'siem_winlogbeat_ecs',
    defaultIndexPattern: 'winlogbeat-*',
    jobs: ['rare_process_windows_ecs'],
  },
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

// const embeddedJobs = [
//   { title: 'Suspicious Login Activity', description: 'rc-original-suspicious-login-activity-2' },
//   { title: 'Rare Process Linux', description: 'rc-rare-process-linux-7' },
//   { title: 'Rare Process Windows', description: 'rc-rare-process-windows-5' },
//   {
//     title: 'Hosts High Process Count',
//     description: 'siem-api-test-hosts_high_count_process_events_ecs',
//   },
//   {
//     title: 'Hosts Rare Process Activity',
//     description: 'siem-api-test-hosts_rare_process_activity_ecs',
//   },
// ];

export const MlPopover = React.memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMlEnabled, setIsMlEnabled] = useState(false);
  const [isInstallJobsButtonVisible, setIsInstallJobsButtonVisible] = useState(false);
  const [showAllJobs, setShowAllJobs] = useState(false);
  const [isLoadingSiemJobs, siemJobs] = useSiemJobs(isOpen);
  const [isLoadingJobSummaryData, jobSummaryData] = useJobSummaryData(siemJobs);

  // const installedJobs = embeddedJobs.filter(job => siemJobs.includes(job.description));

  // Filter Jobs to be shown
  const embeddedJobs = configTemplates.reduce(
    (jobs: string[], configTemplate) => [...jobs, ...configTemplate.jobs],
    []
  );

  const installedJobs = jobSummaryData
    ? jobSummaryData.jobs
        .filter(job => (showAllJobs ? true : embeddedJobs.includes(job.job_id)))
        .map(job => ({ title: job.job_id, description: job.description }))
    : [];

  return (
    <EuiPopover
      id="popover"
      button={
        <EuiButton
          data-test-subj="integrations-button"
          iconType="arrowDown"
          iconSide="right"
          onClick={() => setIsOpen(!isOpen)}
        >
          {i18n.INTEGRATIONS}
        </EuiButton>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(!isOpen)}
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
          <EuiFlexItem>
            <EuiButton
              iconType="plusInCircle"
              onClick={async (e: FormEvent) => {
                const results = await Promise.all([
                  setupMlJob({
                    configTemplate: 'auditbeat_process_hosts_ecs',
                    indexPatternName: 'auditbeat-*',
                    groups: ['siem'],
                  }),
                  setupMlJob({
                    configTemplate: 'auditbeat_process_hosts_ecs',
                    indexPatternName: 'auditbeat-*',
                    groups: ['siem'],
                  }),
                ]);
              }}
            >
              {i18n.CREATE_JOBS}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="xs" />

        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h4>{i18n.JOB_DETAILS}</h4>
            </EuiTitle>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiHorizontalRule />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiText size="s">
          {"Running ML Jobs can be resource intensive. Ensure your cluster's "}
          <EuiLink href="https://www.elastic.co/guide/en/elasticsearch/reference/7.1/modules-node.html#ml-node">
            {'ml nodes'}
          </EuiLink>
          {' are adequately configured before enabling the below jobs:'}
        </EuiText>

        <EuiFlexGroup gutterSize="xs" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={() => setShowAllJobs(!showAllJobs)} size="s">
              {showAllJobs ? i18n.SHOW_ALL_JOBS : i18n.SHOW_SIEM_JOBS}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        {installedJobs.map(job => (
          <JobDetail key={job.title} jobName={job.title} jobDescription={job.description} />
        ))}
      </div>
    </EuiPopover>
  );
});

const JobDetail = React.memo<{ jobName: string; jobDescription: string }>(
  ({ jobName, jobDescription }) => {
    const [enabled, setEnabled] = useState(false);

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
            onChange={e =>
              e.target.checked
                ? startDatafeeds([`datafeed-${jobName}`])
                : stopDatafeeds([`datafeed-${jobName}`])
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
