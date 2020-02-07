/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useContext, useEffect } from 'react';
import { EuiFieldText } from '@elastic/eui';
import { JobCreatorContext } from '../../../job_creator_context';
import { Description } from './description';
import { calculateDatafeedFrequencyDefaultSeconds } from '../../../../../../../../../common/util/job_utils';
import { useStringifiedValue } from '../hooks';

export const FrequencyInput: FC = () => {
  const {
    jobCreator,
    jobCreatorUpdate,
    jobCreatorUpdated,
    jobValidator,
    jobValidatorUpdated,
  } = useContext(JobCreatorContext);
  const [validation, setValidation] = useState(jobValidator.frequency);
  const { value: frequency, setValue: setFrequency } = useStringifiedValue(jobCreator.frequency);

  const [defaultFrequency, setDefaultFrequency] = useState(createDefaultFrequency());

  useEffect(() => {
    jobCreator.frequency = frequency === '' ? null : frequency;
    jobCreatorUpdate();
  }, [frequency]);

  useEffect(() => {
    setFrequency(jobCreator.frequency);

    const df = createDefaultFrequency();
    setDefaultFrequency(df);
  }, [jobCreatorUpdated]);

  useEffect(() => {
    setValidation(jobValidator.frequency);
  }, [jobValidatorUpdated]);

  function createDefaultFrequency() {
    const df = calculateDatafeedFrequencyDefaultSeconds(jobCreator.bucketSpanMs / 1000);
    return `${df}s`;
  }

  return (
    <Description validation={validation}>
      <EuiFieldText
        value={frequency}
        placeholder={defaultFrequency}
        onChange={e => setFrequency(e.target.value)}
        isInvalid={validation.valid === false}
        data-test-subj="mlJobWizardInputFrequency"
      />
    </Description>
  );
};
