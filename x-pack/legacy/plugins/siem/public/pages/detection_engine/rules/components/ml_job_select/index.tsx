/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSuperSelect, EuiText } from '@elastic/eui';

import { FieldHook, getFieldValidityAndErrorMessage } from '../../../../../shared_imports';
import { useSiemJobs } from '../../../../../components/ml_popover/hooks/use_siem_jobs';

const JobDisplay = ({ title, description }: { title: string; description: string }) => (
  <>
    <strong>{title}</strong>
    <EuiText size="xs" color="subdued">
      <p>{description}</p>
    </EuiText>
  </>
);

interface MlJobSelectProps {
  field: FieldHook;
}

export const MlJobSelect: React.FC<MlJobSelectProps> = ({ field }) => {
  const jobId = field.value as string;
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const [isLoading, siemJobs] = useSiemJobs(false);
  const handleJobChange = useCallback(
    (machineLearningJobId: string) => {
      field.setValue(machineLearningJobId);
    },
    [field]
  );

  const options = siemJobs.map(job => ({
    value: job.id,
    inputDisplay: job.id,
    dropdownDisplay: <JobDisplay title={job.id} description={job.description} />,
  }));

  return (
    <EuiFormRow fullWidth label={field.label} isInvalid={isInvalid} error={errorMessage}>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiSuperSelect
            hasDividers
            isLoading={isLoading}
            onChange={handleJobChange}
            options={options}
            valueOfSelected={jobId}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
