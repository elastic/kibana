/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';

import {
  CENTER_ALIGNMENT,
  EuiBasicTable,
  EuiButton,
  EuiEmptyPrompt,
  EuiLink,
  EuiText,
} from '@elastic/eui';

import styled from 'styled-components';
import * as i18n from './translations';
import { JobSwitch, JobSwitchProps } from './job_switch';

const JobNameWrapper = styled.div`
  margin: 5px 0;
`;

const getJobsTableColumns = () => [
  {
    name: i18n.COLUMN_JOB_NAME,
    render: ({ jobName, jobDescription }: { jobName: string; jobDescription: string }) => (
      <JobNameWrapper>
        <EuiLink href={`ml#/explorer?_g=(ml:(jobIds:!(${jobName})))`} target="_blank">
          <EuiText size="s">{jobName}</EuiText>
        </EuiLink>
        <EuiText color="subdued" size="xs">
          {jobDescription}
        </EuiText>
      </JobNameWrapper>
    ),
  },

  {
    name: i18n.COLUMN_RUN_JOB,
    render: ({
      jobName,
      jobState,
      jobDescription,
      datafeedState,
      latestTimestampMs,
      onJobStateChange,
    }: JobSwitchProps) => (
      <JobSwitch
        jobName={jobName}
        jobState={jobState}
        jobDescription={jobDescription}
        datafeedState={datafeedState}
        latestTimestampMs={latestTimestampMs}
        onJobStateChange={onJobStateChange}
      />
    ),
    align: CENTER_ALIGNMENT,
    width: '80px',
  },
];

const getPaginatedItems = (
  items: JobSwitchProps[],
  pageIndex: number,
  pageSize: number
): JobSwitchProps[] => items.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize);

export const JobsTable = React.memo(
  ({ items, isLoading }: { items: JobSwitchProps[]; isLoading: boolean }) => {
    const [pageIndex, setPageIndex] = useState(0);
    const pageSize = 5;

    const pagination = {
      hidePerPageOptions: true,
      pageIndex,
      pageSize,
      totalItemCount: items.length,
    };

    useEffect(() => {
      setPageIndex(0);
    }, [items.length]);

    return (
      <EuiBasicTable
        compressed={true}
        columns={getJobsTableColumns()}
        data-test-subj="jobs-table"
        items={getPaginatedItems(items, pageIndex, pageSize)}
        loading={isLoading}
        noItemsMessage={<NoItemsMessage />}
        pagination={pagination}
        onChange={({ page }: { page: { index: number } }) => {
          setPageIndex(page.index);
        }}
      />
    );
  }
);

export const NoItemsMessage = React.memo(() => (
  <EuiEmptyPrompt
    title={<h3>{i18n.NO_ITEMS_TEXT}</h3>}
    titleSize="xs"
    actions={
      <EuiButton size="s" href="/app/ml#/jobs/new_job/step/index_or_search" target="blank">
        {i18n.CREATE_CUSTOM_JOB}
      </EuiButton>
    }
  />
));
