/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { Redirect } from 'react-router-dom';

import { getCaseUrl } from '../../components/link_to';
import { useGetUrlSearch } from '../../components/navigation/use_get_url_search';
import { WrapperPage } from '../../components/wrapper_page';
import { useGetUserSavedObjectPermissions } from '../../lib/kibana';
import { SpyRoute } from '../../utils/route/spy_routes';
import { navTabs } from '../home/home_navigations';
import { CaseHeaderPage } from './components/case_header_page';
import { Create } from './components/create';
import * as i18n from './translations';

export const CreateCasePage = React.memo(() => {
  const userPermissions = useGetUserSavedObjectPermissions();
  const search = useGetUrlSearch(navTabs.case);

  const backOptions = useMemo(
    () => ({
      href: getCaseUrl(search),
      text: i18n.BACK_TO_ALL,
    }),
    [search]
  );

  if (userPermissions != null && !userPermissions.crud) {
    return <Redirect to={getCaseUrl(search)} />;
  }

  return (
    <>
      <WrapperPage>
        <CaseHeaderPage backOptions={backOptions} title={i18n.CREATE_TITLE} />
        <Create />
      </WrapperPage>
      <SpyRoute />
    </>
  );
});

CreateCasePage.displayName = 'CreateCasePage';
