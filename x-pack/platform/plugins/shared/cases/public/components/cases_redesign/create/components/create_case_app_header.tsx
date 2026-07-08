/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { AppHeader } from '@kbn/app-header';
import { CREATE_CASE_TITLE, PAGE_TITLE } from '../../../../common/translations';
import { useAllCasesNavigation } from '../../../../common/navigation/hooks';

export const CreateCaseAppHeader: FC = () => {
  const { getAllCasesUrl, navigateToAllCases } = useAllCasesNavigation();

  const back = useMemo(
    () => ({
      href: getAllCasesUrl(),
      label: PAGE_TITLE,
      onClick: navigateToAllCases,
    }),
    [getAllCasesUrl, navigateToAllCases]
  );

  return <AppHeader title={CREATE_CASE_TITLE} back={back} sticky={false} />;
};

CreateCaseAppHeader.displayName = 'CreateCaseAppHeader';
