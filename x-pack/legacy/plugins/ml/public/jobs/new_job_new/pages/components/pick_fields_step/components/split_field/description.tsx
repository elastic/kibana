/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, memo, FC } from 'react';
import { EuiDescribedFormGroup, EuiFormRow } from '@elastic/eui';

import { JOB_TYPE } from '../../../../../common/job_creator/util/constants';

interface Props {
  children: JSX.Element;
  jobType: JOB_TYPE;
}

export const Description: FC<Props> = memo(({ children, jobType }) => {
  if (jobType === JOB_TYPE.MULTI_METRIC) {
    const title = 'Split field';
    return (
      <EuiDescribedFormGroup
        idAria="single-example-aria"
        title={<h3>{title}</h3>}
        description={
          <Fragment>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
            incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.
          </Fragment>
        }
      >
        <EuiFormRow label={title} describedByIds={['single-example-aria']}>
          {children}
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  } else if (jobType === JOB_TYPE.POPULATION) {
    const title = 'Population field';
    return (
      <EuiDescribedFormGroup
        idAria="single-example-aria"
        title={<h3>{title}</h3>}
        description={
          <Fragment>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
            incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.
          </Fragment>
        }
      >
        <EuiFormRow label={title} describedByIds={['single-example-aria']}>
          {children}
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  } else {
    return <Fragment />;
  }
});
