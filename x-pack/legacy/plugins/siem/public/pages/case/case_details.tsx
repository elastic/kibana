/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useParams } from 'react-router-dom';

import { CaseView } from './components/case_view';
import { SpyRoute } from '../../utils/route/spy_routes';

export const CaseDetailsPage = React.memo(() => {
  const { detailName: caseId } = useParams();
  if (!caseId) {
    return null;
  }
  return (
    <>
      <CaseView caseId={caseId} />
      <SpyRoute />
    </>
  );
});

CaseDetailsPage.displayName = 'CaseDetailsPage';
