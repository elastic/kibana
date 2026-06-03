/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';

import { CASES_LIST_TITLE, UNDER_CONSTRUCTION } from './translations';

// Placeholder — will be replaced with the full redesigned Cases List page.
export const AllCasesRedesign: React.FC = () => (
  <EuiEmptyPrompt
    data-test-subj="cases-redesign-all-cases"
    iconType="casesApp"
    title={<h2>{CASES_LIST_TITLE}</h2>}
    body={<p>{UNDER_CONSTRUCTION}</p>}
  />
);

AllCasesRedesign.displayName = 'AllCasesRedesign';

// eslint-disable-next-line import/no-default-export
export { AllCasesRedesign as default };
