/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback } from 'react';
import { Redirect } from 'react-router-dom';
import { EuiButton, EuiFieldText, EuiRange, EuiSuperSelect, EuiText } from '@elastic/eui';

import { DETECTION_ENGINE_PAGE_NAME } from '../../../../components/link_to/redirect_to_detection_engine';
import { useSiemJobs } from '../../../../components/ml_popover/hooks/use_siem_jobs';
import { usePersistRule } from '../../../../containers/detection_engine/rules';
import { RuleType } from '../../../../../server/lib/detection_engine/types';

type Event = React.ChangeEvent<HTMLInputElement>;
type EventArg = Event | React.MouseEvent<HTMLButtonElement>;

const JobDisplay = ({ title, description }: { title: string; description: string }) => (
  <>
    <strong>{title}</strong>
    <EuiText size="xs" color="subdued">
      <p>{description}</p>
    </EuiText>
  </>
);

const formatRule = ({
  jobId,
  name,
  threshold,
}: {
  jobId: string;
  name: string;
  threshold: number;
}) => ({
  ml_job_id: jobId,
  anomaly_threshold: threshold,
  name,
  index: [],
  language: 'kuery',
  query: '',
  filters: [],
  false_positives: [],
  references: [],
  risk_score: 50,
  threat: [],
  severity: 'low',
  tags: [],
  interval: '5m',
  from: 'now-360s',
  enabled: false,
  to: 'now',
  type: 'machine_learning' as RuleType,
  description: 'Test ML Rule',
});

export const CreateMLRulePage = () => {
  const [jobsLoading, siemJobs] = useSiemJobs(false);
  const [{ isLoading: ruleLoading, isSaved }, setRule] = usePersistRule();
  const [jobId, setJobId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [threshold, setThreshold] = useState<number>(50);
  const isLoading = jobsLoading || ruleLoading;

  const submit = useCallback(() => {
    console.log(name, jobId, threshold);
    setRule(
      formatRule({
        jobId,
        name,
        threshold,
      })
    );
  }, [name, jobId, threshold]);

  const onNameChange = useCallback((event: Event) => {
    setName(event.target.value);
  }, []);
  const onThresholdChange = useCallback((event: EventArg) => {
    setThreshold(Number((event as Event).target.value));
  }, []);

  const options = siemJobs.map(job => ({
    value: job.id,
    inputDisplay: job.id,
    dropdownDisplay: <JobDisplay title={job.id} description={job.description} />,
  }));

  if (isSaved) {
    return <Redirect to={`/${DETECTION_ENGINE_PAGE_NAME}/rules`} />;
  }

  return (
    <>
      <EuiFieldText onChange={onNameChange} placeholder="Rule name" value={name}></EuiFieldText>
      <EuiSuperSelect
        hasDividers
        isLoading={isLoading}
        onChange={setJobId}
        options={options}
        valueOfSelected={jobId}
      />
      <EuiRange min={0} max={100} value={threshold} onChange={onThresholdChange} showInput />
      <EuiButton onClick={submit} disabled={isLoading}>
        Create ML Rule
      </EuiButton>
    </>
  );
};
