/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiTextArea } from '@elastic/eui';
import { Description } from './description';

interface Props {
  jobDescription: string;
  setJobDescription: (id: string) => void;
}

export const JobDescriptionInput: FC<Props> = ({ jobDescription, setJobDescription }) => {
  return (
    <Description>
      <EuiTextArea
        placeholder="Job description"
        value={jobDescription}
        onChange={e => setJobDescription(e.target.value)}
      />
    </Description>
  );
};
