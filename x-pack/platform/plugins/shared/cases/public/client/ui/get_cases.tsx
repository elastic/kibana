/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { lazy, Suspense } from 'react';
import type { CasesProps } from '../../components/app';
import type { CasesContextProps } from '../../components/cases_context';
import { CasesProvider } from '../../components/cases_context';

type GetCasesPropsInternal = CasesProps & CasesContextProps;
export type GetCasesProps = Omit<
  GetCasesPropsInternal,
  | 'externalReferenceAttachmentTypeRegistry'
  | 'persistableStateAttachmentTypeRegistry'
  | 'unifiedAttachmentTypeRegistry'
  | 'getFilesClient'
>;

const CasesRoutesLazy: React.FC<CasesProps> = lazy(() => import('../../components/app/routes'));

export const getCasesLazy = ({
  externalReferenceAttachmentTypeRegistry,
  persistableStateAttachmentTypeRegistry,
  unifiedAttachmentTypeRegistry,
  getFilesClient,
  owner,
  permissions,
  basePath,
  actionsNavigation,
  ruleDetailsNavigation,
  showAlertDetails,
  useFetchAlertData,
  onAlertsTableLoaded,
  refreshRef,
  timelineIntegration,
  features,
  releasePhase,
  renderAlertsTable,
  renderEventsTable,
}: GetCasesPropsInternal) => (
  <CasesProvider
    value={{
      externalReferenceAttachmentTypeRegistry,
      persistableStateAttachmentTypeRegistry,
      unifiedAttachmentTypeRegistry,
      getFilesClient,
      owner,
      permissions,
      basePath,
      features,
      releasePhase,
    }}
  >
    <Suspense fallback={<EuiLoadingSpinner />}>
      <CasesRoutesLazy
        actionsNavigation={actionsNavigation}
        ruleDetailsNavigation={ruleDetailsNavigation}
        showAlertDetails={showAlertDetails}
        useFetchAlertData={useFetchAlertData}
        onAlertsTableLoaded={onAlertsTableLoaded}
        refreshRef={refreshRef}
        timelineIntegration={timelineIntegration}
        renderAlertsTable={renderAlertsTable}
        renderEventsTable={renderEventsTable}
      />
    </Suspense>
  </CasesProvider>
);
