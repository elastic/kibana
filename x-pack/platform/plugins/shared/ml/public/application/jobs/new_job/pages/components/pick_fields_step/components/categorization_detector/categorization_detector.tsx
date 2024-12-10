/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useContext, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiSpacer, EuiTitle } from '@elastic/eui';
import { ML_JOB_AGGREGATION } from '@kbn/ml-anomaly-utils';
import { JobCreatorContext } from '../../../job_creator_context';
import type { CategorizationJobCreator } from '../../../../../common/job_creator';
import { CountCard, HighCountCard, RareCard } from './detector_cards';

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorizationDetectorType]);

  useEffect(() => {
    setCategorizationDetectorType(jobCreator.selectedDetectorType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobCreatorUpdated]);

  function onCountSelection() {
    setCategorizationDetectorType(ML_JOB_AGGREGATION.COUNT);
  }
  function onHighCountSelection() {
    setCategorizationDetectorType(ML_JOB_AGGREGATION.HIGH_COUNT);
  }
  function onRareSelection() {
    setCategorizationDetectorType(ML_JOB_AGGREGATION.RARE);
  }

  return (
    <>
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="xpack.ml.newJob.wizard.pickFieldsStep.categorizationDetectorSelect.title"
            defaultMessage="Categorization detector"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="l" css={{ maxWidth: '1100px' }}>
        <CountCard
          onClick={onCountSelection}
          isSelected={categorizationDetectorType === ML_JOB_AGGREGATION.COUNT}
        />
        <HighCountCard
          onClick={onHighCountSelection}
          isSelected={categorizationDetectorType === ML_JOB_AGGREGATION.HIGH_COUNT}
        />
        <RareCard
          onClick={onRareSelection}
          isSelected={categorizationDetectorType === ML_JOB_AGGREGATION.RARE}
        />
      </EuiFlexGroup>
    </>
  );
};
