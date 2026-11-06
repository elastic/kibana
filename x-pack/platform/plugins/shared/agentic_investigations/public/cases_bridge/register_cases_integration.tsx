/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { CoreSetup } from '@kbn/core/public';
import type {
  CasesPublicSetup,
  CaseViewCloseModalSectionProps,
  CaseViewSectionProps,
} from '@kbn/cases-plugin/public';
import { defineAttachment } from '@kbn/cases-plugin/public';
import {
  INVESTIGATION_CASE_ATTACHMENT_TYPE,
  investigationCaseAttachmentPayloadSchema,
} from '../../common/cases_bridge';
import type { AgenticInvestigationsPublicStartDependencies } from '../types';
import { getLinkedInvestigationIds, hasLinkedInvestigations } from './case_data';
import { ATTACHMENT } from './translations';

type StartServicesGetter =
  CoreSetup<AgenticInvestigationsPublicStartDependencies>['getStartServices'];

/**
 * The bridge's case-view pieces render inside the Cases app, so they bring this plugin's own
 * services and one query cache shared by the Related tab, the sidebar, and the close modal.
 */
const makeLazy = <P extends object>(
  getStartServices: StartServicesGetter,
  getComponent: () => Promise<React.ComponentType<P>>
) =>
  React.lazy(async () => {
    const [[core, deps], { KibanaContextProvider }, { getBridgeQueryClient }, Component] =
      await Promise.all([
        getStartServices(),
        import('@kbn/kibana-react-plugin/public'),
        import('./query_client'),
        getComponent(),
      ]);
    const { QueryClientProvider } = await import('@kbn/react-query');
    const services = { ...core, ...deps };
    const Wrapped: React.FC<P> = (props) => (
      <KibanaContextProvider services={services}>
        <QueryClientProvider client={getBridgeQueryClient()}>
          <Component {...props} />
        </QueryClientProvider>
      </KibanaContextProvider>
    );
    return { default: Wrapped };
  });

export const registerCasesIntegration = ({
  cases,
  getStartServices,
}: {
  cases: CasesPublicSetup;
  getStartServices: StartServicesGetter;
}): void => {
  const LazyRelated = makeLazy<CaseViewSectionProps>(
    getStartServices,
    async () => (await import('./related_investigations_section')).RelatedInvestigationsSection
  );
  const LazySidebarLine = makeLazy<CaseViewSectionProps>(
    getStartServices,
    async () => (await import('./verdict_sidebar_line')).VerdictSidebarLine
  );
  const LazyCloseSection = makeLazy<CaseViewCloseModalSectionProps>(
    getStartServices,
    async () => (await import('./close_modal_section')).CloseModalSection
  );
  const LazyLinkEvent = makeLazy<{ attachmentId: string; caseId: string }>(
    getStartServices,
    async () => (await import('./investigation_link_event')).InvestigationLinkEvent
  );

  cases.attachmentFramework.registerAttachment(
    defineAttachment({
      id: INVESTIGATION_CASE_ATTACHMENT_TYPE,
      schema: investigationCaseAttachmentPayloadSchema,
      getIcon: () => 'logoSecurity',
      getLabel: () => ATTACHMENT.label,
      getCreationActivity: (props) => ({
        eventColor: 'subdued' as const,
        event: (
          <Suspense fallback={ATTACHMENT.linked}>
            <LazyLinkEvent attachmentId={String(props.attachmentId)} caseId={props.caseData.id} />
          </Suspense>
        ),
        hideDefaultActions: false,
      }),
      getRemovalActivity: () => ({ event: ATTACHMENT.removed }),
    })
  );

  cases.caseView.registerSection({
    id: 'agenticInvestigations.related',
    position: 'related',
    isVisible: hasLinkedInvestigations,
    getCount: (caseData) => getLinkedInvestigationIds(caseData).length,
    render: (props) => (
      <Suspense fallback={<EuiLoadingSpinner size="m" />}>
        <LazyRelated {...props} />
      </Suspense>
    ),
  });
  cases.caseView.registerSection({
    id: 'agenticInvestigations.verdict',
    position: 'sidebar',
    isVisible: hasLinkedInvestigations,
    render: (props) => (
      <Suspense fallback={null}>
        <LazySidebarLine {...props} />
      </Suspense>
    ),
  });
  cases.caseView.registerSection({
    id: 'agenticInvestigations.close',
    position: 'closeModal',
    isVisible: hasLinkedInvestigations,
    render: (props) => (
      <Suspense fallback={null}>
        <LazyCloseSection {...props} />
      </Suspense>
    ),
  });
};
