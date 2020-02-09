/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { getMlJobId } from '../../../../../common/ml_job_constants';
import { MLLink } from './MLLink';

interface Props {
  serviceName: string;
  transactionType?: string;
}

export const MLJobLink: React.FC<Props> = ({
  serviceName,
  transactionType,
  children
}) => {
  const jobId = getMlJobId(serviceName, transactionType);
  const query = {
    ml: { jobIds: [jobId] }
  };

  return (
    <MLLink children={children} query={query} path="/timeseriesexplorer" />
  );
};
