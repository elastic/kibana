/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useParams, Redirect } from 'react-router-dom';

import { useGetUrlSearch } from '../../components/navigation/use_get_url_search';
import { useIsUserCanCrud } from '../../lib/kibana';
import { SpyRoute } from '../../utils/route/spy_routes';
import { getCaseUrl } from '../../components/link_to';
import { navTabs } from '../home/home_navigations';
import { CaseView } from './components/case_view';

export const CaseDetailsPage = React.memo(() => {
  const isUserCanCrud = useIsUserCanCrud();
  const { detailName: caseId } = useParams();
  const search = useGetUrlSearch(navTabs.case);

  if (!isUserCanCrud) {
    return <Redirect to={getCaseUrl(search)} />;
  }

  return caseId != null ? (
    <>
      <CaseView caseId={caseId} />
      <SpyRoute />
    </>
  ) : null;
});

CaseDetailsPage.displayName = 'CaseDetailsPage';
