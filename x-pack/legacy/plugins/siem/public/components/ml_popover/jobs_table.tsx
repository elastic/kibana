/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiBasicTable, EuiLink, EuiText } from '@elastic/eui';

import { RIGHT_ALIGNMENT } from '@elastic/eui/lib/services';
import styled from 'styled-components';
import * as i18n from './translations';
import { JobDetail, JobDetailProps } from './job_detail';

const JobNameWrapper = styled.div`
  margin: 5px 0;
`;

const getJobsTableColumns = () => [
  {
    name: i18n.COLUMN_JOB_NAME,
    render: ({ jobName, jobDescription }: JobDetailProps) => (
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
    render: ({ jobName, jobDescription, isChecked, onJobStateChange }: JobDetailProps) => (
      <JobDetail
        jobName={jobName}
        jobDescription={jobDescription}
        isChecked={isChecked}
        onJobStateChange={onJobStateChange}
      />
    ),
    align: RIGHT_ALIGNMENT,
    width: '80px',
  },
];

export const JobsTable = React.memo(
  ({ items, isLoading }: { items: JobDetailProps[]; isLoading: boolean }) => {
    const pagination = {
      pageIndex: 0,
      pageSize: 5,
      totalItemCount: items.length,
      pageSizeOptions: [3, 5, 8],
      hidePerPageOptions: true,
    };

    return (
      <EuiBasicTable
        compressed={true}
        columns={getJobsTableColumns()}
        data-test-subj="jobs-table"
        items={items}
        loading={isLoading}
        noItemsMessage={i18n.NO_ITEMS_TEXT}
        pagination={pagination}
        onChange={({ page = {} }) => {}}
      />
    );
  }
);
