/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiFieldText } from '@elastic/eui';
import { Description } from './description';

interface Props {
  jobId: string;
  setJobId: (id: string) => void;
}

export const JobIdInput: FC<Props> = ({ jobId, setJobId }) => {
  return (
    <Description>
      <EuiFieldText placeholder="Job Id" value={jobId} onChange={e => setJobId(e.target.value)} />
    </Description>
  );
};
