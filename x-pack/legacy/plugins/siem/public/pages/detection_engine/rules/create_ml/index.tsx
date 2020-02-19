/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback } from 'react';
import { EuiButton, EuiRange, EuiSuperSelect, EuiText } from '@elastic/eui';

import { useSiemJobs } from '../../../../components/ml_popover/hooks/use_siem_jobs';

interface JobDisplayProps {
  title: string;
  description: string;
}
const JobDisplay = ({ title, description }: JobDisplayProps) => (
  <>
    <strong>{title}</strong>
    <EuiText size="xs" color="subdued">
      <p>{description}</p>
    </EuiText>
  </>
);

export const CreateMLRulePage = () => {
  const [isLoading, siemJobs] = useSiemJobs(false);
  const [jobId, setJobId] = useState<string>('');
  const [threshold, setThreshold] = useState<number>(50);

  const submit = useCallback(() => {
    console.log(jobId, threshold);
  }, [jobId, threshold]);

  const onThresholdChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLButtonElement>) => {
      setThreshold(Number((event as React.ChangeEvent<HTMLInputElement>).target.value));
    },
    []
  );

  const options = siemJobs.map(job => ({
    value: job.id,
    inputDisplay: job.id,
    dropdownDisplay: <JobDisplay title={job.id} description={job.description} />,
  }));

  return (
    <>
      <EuiSuperSelect
        hasDividers
        isLoading={isLoading}
        onChange={setJobId}
        options={options}
        valueOfSelected={jobId}
      />
      <EuiRange min={0} max={100} value={threshold} onChange={onThresholdChange} showInput />
      <EuiButton onClick={submit}>Create ML Rule</EuiButton>
    </>
  );
};
