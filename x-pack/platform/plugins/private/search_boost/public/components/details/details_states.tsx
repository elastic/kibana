/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import type { LinkProps } from '../../types';
import { NOT_FOUND_BODY } from '../../translations';

interface DetailsNotFoundProps {
  title: string;
  backLabel: string;
  backLinkProps: LinkProps;
}

export const DetailsNotFound = ({ title, backLabel, backLinkProps }: DetailsNotFoundProps) => (
  <EuiEmptyPrompt
    iconType="magnify"
    title={<h2>{title}</h2>}
    body={NOT_FOUND_BODY}
    actions={
      <EuiButton {...backLinkProps} data-test-subj="searchBoostNotFoundBack">
        {backLabel}
      </EuiButton>
    }
    data-test-subj="searchBoostNotFound"
  />
);
