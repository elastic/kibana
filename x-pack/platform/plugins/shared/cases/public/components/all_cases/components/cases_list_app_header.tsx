/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { GENERAL_CASES_OWNER, SECURITY_SOLUTION_OWNER } from '../../../../common/constants';
import { PAGE_TITLE } from '../../../common/translations';
import { useCreateCaseNavigation } from '../../../common/navigation';
import {
  useConfigureCasesNavigation,
  useCasesTemplatesNavigation,
} from '../../../common/navigation/hooks';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { KibanaServices, useKibana } from '../../../common/lib/kibana';
import { CasesAppHeader } from '../../app/cases_app_header';
import { useGetActionLicense } from '../../../containers/use_get_action_license';
import { getListMenu } from './header_menu';

/**
 * Template library lives in the chrome Cases sub-nav for Security (classic and solution navs)
 * and for Observability solution navs. Stack Management and Observability's classic nav have
 * no Cases sub-nav, so the header button is their only entry point.
 */
const useHasTemplatesInChromeNav = (): boolean => {
  const { owner } = useCasesContext();
  const { chrome } = useKibana().services;
  const chromeStyle$ = useMemo(() => chrome.getChromeStyle$(), [chrome]);
  const chromeStyle = useObservable(chromeStyle$, chrome.getChromeStyle());

  if (owner.includes(GENERAL_CASES_OWNER)) {
    return false;
  }
  if (owner.includes(SECURITY_SOLUTION_OWNER)) {
    return true;
  }
  return chromeStyle === 'project';
};

export const CasesListAppHeader: FC = () => {
  const { permissions } = useCasesContext();
  const { navigateToCreateCase } = useCreateCaseNavigation();
  const { navigateToConfigureCases } = useConfigureCasesNavigation();
  const { getCasesTemplatesUrl, navigateToCasesTemplates } = useCasesTemplatesNavigation();
  const isTemplatesEnabled = KibanaServices.getConfig()?.templates?.enabled ?? false;
  const hasTemplatesInChromeNav = useHasTemplatesInChromeNav();
  const showTemplatesButton =
    isTemplatesEnabled && permissions.manageTemplates && !hasTemplatesInChromeNav;
  const { data: actionLicense } = useGetActionLicense();

  const menu = useMemo(
    () =>
      getListMenu({
        permissions,
        showTemplatesButton,
        actionLicense: actionLicense ?? null,
        navigateToCreateCase,
        navigateToConfigureCases,
        navigateToCasesTemplates,
        getCasesTemplatesUrl,
      }),
    [
      permissions,
      showTemplatesButton,
      actionLicense,
      navigateToCreateCase,
      navigateToConfigureCases,
      navigateToCasesTemplates,
      getCasesTemplatesUrl,
    ]
  );

  return <CasesAppHeader title={PAGE_TITLE} menu={menu} />;
};

CasesListAppHeader.displayName = 'CasesListAppHeader';
