/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useContext, useEffect } from 'react';
import { EuiFieldNumber } from '@elastic/eui';
import { newJobDefaults } from '../../../../../../new_job_new/utils/new_job_defaults';
import { JobCreatorContext } from '../../../job_creator_context';
import { Description } from './description';

export const ScrollSizeInput: FC = () => {
  const { jobCreator, jobCreatorUpdate, jobValidator, jobValidatorUpdated } = useContext(
    JobCreatorContext
  );
  const [validation, setValidation] = useState(jobValidator.scrollSize);
  const [scrollSizeString, setScrollSize] = useState(
    jobCreator.scrollSize === null ? '' : `${jobCreator.scrollSize}`
  );

  const { datafeeds } = newJobDefaults();
  const scrollSizeDefault = datafeeds.scroll_size !== undefined ? `${datafeeds.scroll_size}` : '';

  useEffect(() => {
    jobCreator.scrollSize = scrollSizeString === '' ? null : +scrollSizeString;
    jobCreatorUpdate();
  }, [scrollSizeString]);

  useEffect(() => {
    setScrollSize(jobCreator.scrollSize === null ? '' : `${jobCreator.scrollSize}`);
  }, [jobCreatorUpdate]);

  useEffect(() => {
    setValidation(jobValidator.scrollSize);
  }, [jobValidatorUpdated]);

  return (
    <Description validation={validation}>
      <EuiFieldNumber
        min={0}
        placeholder={scrollSizeDefault}
        value={scrollSizeString === '' ? scrollSizeString : +scrollSizeString}
        onChange={e => setScrollSize(e.target.value)}
        isInvalid={validation.valid === false}
        data-test-subj="mlJobWizardInputScrollSize"
      />
    </Description>
  );
};
