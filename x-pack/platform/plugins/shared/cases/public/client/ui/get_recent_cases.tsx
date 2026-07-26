/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { lazy, Suspense } from 'react';
import type { CasesContextProps } from '../../components/cases_context';
import { CasesProvider } from '../../components/cases_context';
import type { RecentCasesProps } from '../../components/recent_cases';

type GetRecentCasesPropsInternal = RecentCasesProps & CasesContextProps;
export type GetRecentCasesProps = Omit<
  GetRecentCasesPropsInternal,
  | 'externalReferenceAttachmentTypeRegistry'
  | 'persistableStateAttachmentTypeRegistry'
  | 'unifiedAttachmentTypeRegistry'
  | 'getFilesClient'
>;

const RecentCasesLazy: React.FC<RecentCasesProps> = lazy(
  () => import('../../components/recent_cases')
);
export const getRecentCasesLazy = ({
  externalReferenceAttachmentTypeRegistry,
  persistableStateAttachmentTypeRegistry,
  unifiedAttachmentTypeRegistry,
  getFilesClient,
  owner,
  permissions,
  maxCasesToShow,
}: GetRecentCasesPropsInternal) => (
  <CasesProvider
    value={{
      externalReferenceAttachmentTypeRegistry,
      persistableStateAttachmentTypeRegistry,
      unifiedAttachmentTypeRegistry,
      getFilesClient,
      owner,
      permissions,
    }}
  >
    <Suspense fallback={<EuiLoadingSpinner />}>
      <RecentCasesLazy maxCasesToShow={maxCasesToShow} />
    </Suspense>
  </CasesProvider>
);
