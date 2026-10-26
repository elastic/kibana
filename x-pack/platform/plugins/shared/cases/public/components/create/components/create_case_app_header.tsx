/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import type { AppHeaderMenu } from '@kbn/app-header';
import { CREATE_CASE_TITLE, PAGE_TITLE } from '../../../common/translations';
import { useAllCasesNavigation } from '../../../common/navigation/hooks';
import { useKibana } from '../../../common/lib/kibana';
import { CasesAppHeader } from '../../app/cases_app_header';

// An explicit (empty) menu stops AppHeader from rendering the host app's legacy action menu in
// place of the overflow menu, so the Documentation and Add integrations items always show there.
const MENU: AppHeaderMenu = { items: [] };

export const CreateCaseAppHeader: FC = () => {
  const { docLinks } = useKibana().services;
  const { getAllCasesUrl, navigateToAllCases } = useAllCasesNavigation();

  const back = useMemo(
    () => ({
      href: getAllCasesUrl(),
      label: PAGE_TITLE,
      // AppHeader's back button keeps its `href` on the rendered anchor, so the default
      // navigation must be prevented here to avoid a full page reload alongside the SPA one.
      onClick: (event: React.MouseEvent) => {
        event.preventDefault();
        navigateToAllCases();
      },
    }),
    [getAllCasesUrl, navigateToAllCases]
  );

  return (
    <CasesAppHeader
      title={CREATE_CASE_TITLE}
      back={back}
      menu={MENU}
      docLink={docLinks.links.cases.createCases}
      showAddIntegrations
    />
  );
};

CreateCaseAppHeader.displayName = 'CreateCaseAppHeader';
