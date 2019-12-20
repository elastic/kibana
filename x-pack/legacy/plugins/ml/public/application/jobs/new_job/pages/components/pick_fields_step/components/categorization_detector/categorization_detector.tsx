/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext, useEffect, useState } from 'react';

import { CategorizationDetectorSelect } from './categorization_detector_select';
import { JobCreatorContext } from '../../../job_creator_context';
import { CategorizationJobCreator } from '../../../../../common/job_creator';
import { Description } from './description';

export const CategorizationDetector: FC = () => {
  const { jobCreator: jc, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as CategorizationJobCreator;
  const [categorizationDetectorType, setCategorizationDetectorType] = useState(
    jobCreator.selectedDetectorType
  );

  useEffect(() => {
    if (categorizationDetectorType !== jobCreator.selectedDetectorType) {
      jobCreator.setDetectorType(categorizationDetectorType);
      jobCreatorUpdate();
    }
  }, [categorizationDetectorType]);

  useEffect(() => {
    setCategorizationDetectorType(jobCreator.selectedDetectorType);
  }, [jobCreatorUpdated]);

  return (
    <Description>
      <CategorizationDetectorSelect
        changeHandler={setCategorizationDetectorType}
        selectedDetectorType={categorizationDetectorType}
      />
    </Description>
  );
};
