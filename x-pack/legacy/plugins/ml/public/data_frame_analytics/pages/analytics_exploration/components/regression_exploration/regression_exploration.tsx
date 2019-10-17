/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment } from 'react';
// import { i18n } from '@kbn/i18n';
import { EuiSpacer } from '@elastic/eui';

import { EvaluatePanel } from './evaluate_panel';
// import { ResultsTable } from './results_table';

interface Props {
  jobId: string;
  destIndex: string;
  dependentVariable: string;
}

export const RegressionExploration: FC<Props> = ({ jobId, destIndex, dependentVariable }) => {
  return (
    <Fragment>
      <EvaluatePanel jobId={jobId} index={destIndex} dependentVariable={dependentVariable} />
      <EuiSpacer />
      {/* <ResultsTable jobId={jobId} /> */}
    </Fragment>
  );
};
