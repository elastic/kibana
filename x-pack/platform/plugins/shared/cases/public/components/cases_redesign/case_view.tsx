/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';

import { useCaseViewParams } from '../../common/navigation';
import { CASE_DETAILS_TITLE, VIEWING_CASE } from './translations';

// Placeholder — will be replaced with the full redesigned Case Details page.
export const CaseViewRedesign: React.FC = () => {
  const { detailName: caseId } = useCaseViewParams();

  return (
    <EuiEmptyPrompt
      data-test-subj="cases-redesign-case-view"
      iconType="casesApp"
      title={<h2>{CASE_DETAILS_TITLE}</h2>}
      body={<p>{VIEWING_CASE(caseId)}</p>}
    />
  );
};

CaseViewRedesign.displayName = 'CaseViewRedesign';

// eslint-disable-next-line import/no-default-export
export { CaseViewRedesign as default };
