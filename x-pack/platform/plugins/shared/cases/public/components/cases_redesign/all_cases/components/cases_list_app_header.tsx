/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { PAGE_TITLE } from '../../../../common/translations';
import {
  useCreateCaseNavigation,
  useConfigureCasesNavigation,
} from '../../../../common/navigation/hooks';
import { useCasesContext } from '../../../cases_context/use_cases_context';
import { CasesAppHeader } from '../../../app/cases_app_header';
import { getListMenu } from './header_menu';

export const CasesListAppHeader: FC = () => {
  const { permissions } = useCasesContext();
  const { navigateToCreateCase } = useCreateCaseNavigation();
  const { navigateToConfigureCases } = useConfigureCasesNavigation();

  const menu = useMemo(
    () =>
      getListMenu({
        permissions,
        navigateToCreateCase,
        navigateToConfigureCases,
      }),
    [permissions, navigateToCreateCase, navigateToConfigureCases]
  );

  return <CasesAppHeader title={PAGE_TITLE} menu={menu} />;
};

CasesListAppHeader.displayName = 'CasesListAppHeader';
