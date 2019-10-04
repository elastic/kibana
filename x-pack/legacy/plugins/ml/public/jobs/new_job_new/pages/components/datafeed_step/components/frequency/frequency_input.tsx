/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useContext, useEffect } from 'react';
import { EuiFieldText } from '@elastic/eui';
import { JobCreatorContext } from '../../../job_creator_context';
import { Description } from './description';

export const FrequencyInput: FC = () => {
  const { jobCreator, jobCreatorUpdate, jobValidator, jobValidatorUpdated } = useContext(
    JobCreatorContext
  );
  const [validation, setValidation] = useState(jobValidator.frequency);
  const [frequency, setFrequency] = useState(
    jobCreator.frequency === null ? '' : jobCreator.frequency
  );

  useEffect(() => {
    jobCreator.frequency = frequency === '' ? null : frequency;
    jobCreatorUpdate();
  }, [frequency]);

  useEffect(() => {
    setValidation(jobValidator.frequency);
  }, [jobValidatorUpdated]);

  return (
    <Description validation={validation}>
      <EuiFieldText
        value={frequency}
        onChange={e => setFrequency(e.target.value)}
        isInvalid={validation.valid === false}
        data-test-subj="mlJobWizardInputFrequency"
      />
    </Description>
  );
};
