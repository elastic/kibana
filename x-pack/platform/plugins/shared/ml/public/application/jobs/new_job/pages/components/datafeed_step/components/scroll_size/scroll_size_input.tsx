/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, SyntheticEvent } from 'react';
import React, { useState, useContext, useEffect } from 'react';
import { EuiFieldNumber, useGeneratedHtmlId } from '@elastic/eui';
import { getNewJobDefaults } from '../../../../../../../services/ml_server_info';
import { JobCreatorContext } from '../../../job_creator_context';
import { Description } from './description';
import { invalidScrollSizeMessage } from '../../../../../common/job_validator/util';

export const ScrollSizeInput: FC = () => {
  const { jobCreator, jobCreatorUpdate, jobValidator, jobValidatorUpdated } =
    useContext(JobCreatorContext);
  const [validation, setValidation] = useState(jobValidator.scrollSize);
  // The browser empties the value of a number input it cannot parse, so the job validator never sees it.
  const [isBadInput, setIsBadInput] = useState(false);
  const [scrollSizeString, setScrollSize] = useState(
    jobCreator.scrollSize === null ? '' : `${jobCreator.scrollSize}`
  );

  const { datafeeds } = getNewJobDefaults();
  const scrollSizeDefault = datafeeds.scroll_size !== undefined ? `${datafeeds.scroll_size}` : '';
  const titleId = useGeneratedHtmlId({
    prefix: 'scrollSizeInput',
  });
  useEffect(() => {
    jobCreator.scrollSize = scrollSizeString === '' ? null : +scrollSizeString;
    jobCreatorUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollSizeString]);

  useEffect(() => {
    setScrollSize(jobCreator.scrollSize === null ? '' : `${jobCreator.scrollSize}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobCreatorUpdate]);

  useEffect(() => {
    setValidation(jobValidator.scrollSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobValidatorUpdated]);

  const checkBadInput = (e: SyntheticEvent<HTMLInputElement>) => {
    setIsBadInput(e.currentTarget.validity.badInput);
  };

  const displayedValidation = isBadInput
    ? { valid: false, message: invalidScrollSizeMessage() }
    : validation;

  return (
    <Description validation={displayedValidation} titleId={titleId}>
      <EuiFieldNumber
        min={0}
        placeholder={scrollSizeDefault}
        value={scrollSizeString === '' ? scrollSizeString : +scrollSizeString}
        onChange={(e) => {
          checkBadInput(e);
          setScrollSize(e.target.value);
        }}
        onKeyUp={checkBadInput}
        isInvalid={displayedValidation.valid === false}
        data-test-subj="mlJobWizardInputScrollSize"
        aria-labelledby={titleId}
      />
    </Description>
  );
};
