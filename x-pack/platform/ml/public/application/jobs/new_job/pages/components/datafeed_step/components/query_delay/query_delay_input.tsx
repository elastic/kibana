/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState, useContext, useEffect } from 'react';
import { EuiFieldText } from '@elastic/eui';
import { JobCreatorContext } from '../../../job_creator_context';
import { Description } from './description';
import { useStringifiedValue } from '../hooks';
import { DEFAULT_QUERY_DELAY } from '../../../../../../../../../common/constants/new_job';

export const QueryDelayInput: FC = () => {
  const { jobCreator, jobCreatorUpdate, jobValidator, jobValidatorUpdated } =
    useContext(JobCreatorContext);
  const [validation, setValidation] = useState(jobValidator.queryDelay);
  const { value: queryDelay, setValue: setQueryDelay } = useStringifiedValue(jobCreator.queryDelay);

  useEffect(() => {
    jobCreator.queryDelay = queryDelay === '' ? null : queryDelay;
    jobCreatorUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryDelay]);

  useEffect(() => {
    setQueryDelay(jobCreator.queryDelay === null ? '' : jobCreator.queryDelay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobCreatorUpdate]);

  useEffect(() => {
    setValidation(jobValidator.queryDelay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobValidatorUpdated]);

  return (
    <Description validation={validation}>
      <EuiFieldText
        value={queryDelay}
        placeholder={DEFAULT_QUERY_DELAY}
        onChange={(e) => setQueryDelay(e.target.value)}
        isInvalid={validation.valid === false}
        data-test-subj="mlJobWizardInputQueryDelay"
      />
    </Description>
  );
};
