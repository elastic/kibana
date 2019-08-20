/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useContext, useEffect } from 'react';
import { EuiSwitch } from '@elastic/eui';
import { JobCreatorContext } from '../../../job_creator_context';
import { Description } from './description';

export const SparseDataSwitch: FC = () => {
  const { jobCreator, jobCreatorUpdate } = useContext(JobCreatorContext);
  const [sparseData, setSparseData] = useState(jobCreator.sparseData);

  useEffect(() => {
    jobCreator.sparseData = sparseData;
    jobCreatorUpdate();
  }, [sparseData]);

  function toggleSparseData() {
    setSparseData(!sparseData);
  }

  return (
    <Description>
      <EuiSwitch
        name="switch"
        checked={sparseData}
        onChange={toggleSparseData}
        data-test-subj="mlJobWizardSwitchSparseData"
      />
    </Description>
  );
};
