/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { JobCreatorContext } from '../../../job_creator_context';
import { BucketSpan } from '../bucket_span';
import { SplitFieldSelector } from '../split_field';
import { Influencers } from '../influencers';

interface Props {
  isActive: boolean;
  setIsValid: (proceed: boolean) => void;
}

export const MultiMetricSettings: FC<Props> = ({ isActive, setIsValid }) => {
  const { jobCreator, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  const [bucketSpan, setBucketSpan] = useState(jobCreator.bucketSpan);

  useEffect(() => {
    jobCreator.bucketSpan = bucketSpan;
    jobCreatorUpdate();
    setIsValid(bucketSpan !== '');
  }, [bucketSpan]);

  useEffect(() => {
    setBucketSpan(jobCreator.bucketSpan);
  }, [jobCreatorUpdated]);

  return (
    <Fragment>
      {isActive && (
        <Fragment>
          <EuiFlexGroup gutterSize="xl">
            <EuiFlexItem>
              <SplitFieldSelector />
            </EuiFlexItem>
            <EuiFlexItem>
              <Influencers />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexGroup gutterSize="xl">
            <EuiFlexItem>
              <BucketSpan />
            </EuiFlexItem>
            <EuiFlexItem />
          </EuiFlexGroup>
        </Fragment>
      )}
    </Fragment>
  );
};
