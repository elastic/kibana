/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useRef, useState } from 'react';
import {
  EuiAccordion,
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
import { useGroupData } from './hooks/use_group_data';
import { Group } from './types';
import { setupMlJob, startDatafeeds, stopDatafeeds } from './api';

import * as i18n from './translations';

const embeddedJobs = [
  { title: 'Suspicious Login Activity', description: 'rc-original-suspicious-login-activity-2' },
  { title: 'Rare Process Linux', description: 'rc-rare-process-linux-7' },
  { title: 'Rare Process Windows', description: 'rc-rare-process-windows-5' },
  {
    title: 'Hosts High Process Count',
    description: 'siem-api-test-hosts_high_count_process_events_ecs',
  },
  {
    title: 'Hosts Rare Process Activity',
    description: 'siem-api-test-hosts_rare_process_activity_ecs',
  },
];

export const MlPopover = React.memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMlEnabled, setIsMlEnabled] = useState(false);
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [isLoadingGroupData, groupData] = useGroupData(isOpen && isAccordionOpen);
  const accordionRef = useRef(null);

  const siemJobIds = groupData.reduce((jobIds: string[], group: Group) => {
    return group.id === 'siem' ? [...jobIds, ...group.jobIds] : jobIds;
  }, []);

  const installedJobs = embeddedJobs.filter(job => siemJobIds.includes(job.description));

  const buttonContent = (
    <div ref={accordionRef}>
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
    </div>
  );

  return (
    <EuiPopover
      id="popover"
      button={
        <EuiButtonEmpty size="xs" onClick={() => setIsOpen(!isOpen)}>
          <EuiIcon type="machineLearningApp" size="l" />
        </EuiButtonEmpty>
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
            <EuiSwitch
              onChange={e => {
                if (e.target.checked) {
                  if (accordionRef != null && accordionRef.current != null && !isAccordionOpen) {
                    accordionRef.current.click();
                  }
                  setupMlJob({
                    configTemplate: 'auditbeat_process_hosts_ecs',
                    indexPatternName: 'auditbeat-*',
                    groups: ['siem'],
                  });
                }

                setIsMlEnabled(e.target.checked);
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="xs" />

        <EuiAccordion
          id="job-details-accordion"
          buttonContent={buttonContent}
          onToggle={isAccOpen => setIsAccordionOpen(isAccOpen)}
        >
          <EuiText size="s">
            {"Running ML Jobs can be resource intensive. Ensure your cluster's "}
            <EuiLink href="https://www.elastic.co/guide/en/elasticsearch/reference/7.1/modules-node.html#ml-node">
              {'ml nodes'}
            </EuiLink>
            {' are adequately configured before enabling the below jobs:'}
          </EuiText>
          <EuiSpacer size="s" />

          {installedJobs.map(job => (
            <JobDetail jobName={job.title} jobId={job.description} disabled={!isMlEnabled} />
          ))}
        </EuiAccordion>
      </div>
    </EuiPopover>
  );
});

const JobDetail = React.memo<{ jobName: string; jobId: string; disabled: boolean }>(
  ({ jobName, jobId, disabled }) => {
    const [enabled, setEnabled] = useState(false);

    return (
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h5>{jobName}</h5>
          </EuiTitle>
          <EuiText size="s">{jobId}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            disabled={disabled}
            onChange={e =>
              e.target.checked
                ? startDatafeeds([`datafeed-${jobId}`])
                : stopDatafeeds([`datafeed-${jobId}`])
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
