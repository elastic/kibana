/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useContext, useEffect } from 'react';
import { EuiSwitch } from '@elastic/eui';
import { JobCreatorContext } from '../../../job_creator_context';
import { Description } from './description';
import { ES_AGGREGATION } from '../../../../../../../../common/constants/aggregation_types';

export const SparseDataSwitch: FC = () => {
  const { jobCreator, jobCreatorUpdated, jobCreatorUpdate } = useContext(JobCreatorContext);
  const [sparseData, setSparseData] = useState(jobCreator.sparseData);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    jobCreator.sparseData = sparseData;
    jobCreatorUpdate();
  }, [sparseData]);

  useEffect(() => {
    const aggs = [ES_AGGREGATION.COUNT, ES_AGGREGATION.SUM];
    const isCountOrSum = jobCreator.aggregations.some(agg => aggs.includes(agg.dslName));
    setEnabled(isCountOrSum);
    if (isCountOrSum === false && sparseData === true) {
      setSparseData(false);
    }
  }, [jobCreatorUpdated]);

  function toggleSparseData() {
    setSparseData(!sparseData);
  }

  return (
    <Description>
      <EuiSwitch
        name="switch"
        disabled={enabled === false}
        checked={sparseData}
        onChange={toggleSparseData}
        data-test-subj="mlJobWizardSwitchSparseData"
      />
    </Description>
  );
};
