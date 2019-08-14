/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';

import { JobCreatorContext } from '../../../job_creator_context';
import { BucketSpan } from '../bucket_span';

import { CREATED_BY_LABEL } from '../../../../../common/job_creator/util/constants';
import { mlJobService } from '../../../../../../../services/job_service';

interface Props {
  isActive: boolean;
  setIsValid: (proceed: boolean) => void;
}

export const SingleMetricSettings: FC<Props> = ({ isActive, setIsValid }) => {
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

  const convertToMultiMetricJob = () => {
    jobCreator.createdBy = CREATED_BY_LABEL.MULTI_METRIC;
    mlJobService.tempJobCloningObjects.job = {
      ...jobCreator.jobConfig,
      datafeed_config: jobCreator.datafeedConfig,
    };
    delete mlJobService.tempJobCloningObjects.job.datafeed_config.aggregations;
    delete mlJobService.tempJobCloningObjects.job.analysis_config.summary_count_field_name;

    mlJobService.tempJobCloningObjects.skipTimeRangeStep = true;
    window.location.href = window.location.href.replace('single_metric', 'multi_metric');
  };

  return (
    <Fragment>
      {isActive && (
        <Fragment>
          <EuiFlexGroup gutterSize="xl">
            <EuiFlexItem>
              <BucketSpan />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={convertToMultiMetricJob}>
                Convert to multi metric job
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </Fragment>
      )}
    </Fragment>
  );
};
