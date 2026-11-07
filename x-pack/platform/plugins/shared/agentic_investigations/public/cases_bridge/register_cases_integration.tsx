/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { CoreSetup, IUiSettingsClient } from '@kbn/core/public';
import type {
  CasesPublicSetup,
  CommonAttachmentListViewProps,
  CaseViewCloseModalSectionProps,
  CaseViewSectionProps,
} from '@kbn/cases-plugin/public';
import type { CaseUI } from '@kbn/cases-plugin/common';
import { defineAttachment } from '@kbn/cases-plugin/public';
import {
  HYPOTHESES_CASE_ATTACHMENT_TYPE,
  IMPACT_CASE_ATTACHMENT_TYPE,
  INVESTIGATION_CASE_ATTACHMENT_TYPE,
  OPEN_CASES_FOR_INVESTIGATIONS_SETTING,
  PROPOSAL_CASE_ATTACHMENT_TYPE,
  hypothesesCaseAttachmentPayloadSchema,
  impactCaseAttachmentPayloadSchema,
  investigationCaseAttachmentPayloadSchema,
  proposalCaseAttachmentPayloadSchema,
} from '../../common/cases_bridge';
import type { AgenticInvestigationsPublicStartDependencies } from '../types';
import {
  DECISIONS_TAB_ID,
  getImpactedEntities,
  getLinkedInvestigationIds,
  hasDecisions,
  hasLinkedInvestigations,
} from './case_data';
import { ATTACHMENT, DECISIONS, EVIDENCE } from './translations';

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
  uiSettings,
}: {
  cases: CasesPublicSetup;
  getStartServices: StartServicesGetter;
  uiSettings: IUiSettingsClient;
}): void => {
  // Phase 5 surfaces (Decisions, Needs decision, the copied findings) show only with the setting on.
  const isOpenCasesForInvestigationsOn = () =>
    uiSettings.get<boolean>(OPEN_CASES_FOR_INVESTIGATIONS_SETTING, false) === true;
  cases.decisions.setEnabled(isOpenCasesForInvestigationsOn);

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

  const LazyDecisionsTab = makeLazy<CaseViewSectionProps>(
    getStartServices,
    async () => (await import('./decisions_tab')).DecisionsTab
  );
  const LazyDecisionsNotice = makeLazy<CaseViewSectionProps>(
    getStartServices,
    async () => (await import('./decisions_tab')).DecisionsNotice
  );
  const LazyImpactListInner = React.lazy(async () => ({
    default: (await import('./copied_findings_list')).ImpactList,
  }));
  const LazyHypothesesListInner = React.lazy(async () => ({
    default: (await import('./copied_findings_list')).HypothesesList,
  }));
  // The Attachments tab renders list children without a boundary of their own.
  const LazyImpactList: React.FC<CommonAttachmentListViewProps> = (props) => (
    <Suspense fallback={<EuiLoadingSpinner size="m" />}>
      <LazyImpactListInner {...props} />
    </Suspense>
  );
  const LazyHypothesesList: React.FC<CommonAttachmentListViewProps> = (props) => (
    <Suspense fallback={<EuiLoadingSpinner size="m" />}>
      <LazyHypothesesListInner {...props} />
    </Suspense>
  );

  cases.attachmentFramework.registerAttachment(
    defineAttachment({
      id: PROPOSAL_CASE_ATTACHMENT_TYPE,
      schema: proposalCaseAttachmentPayloadSchema,
      workflowSchema: false,
      getIcon: () => 'checkCircleFill',
      getLabel: () => DECISIONS.attachmentLabel,
      getCreationActivity: (props) => ({
        event: DECISIONS.added(String(props.metadata?.title ?? '')),
        hideDefaultActions: true,
      }),
      getRemovalActivity: () => ({ event: DECISIONS.removed }),
    })
  );
  cases.attachmentFramework.registerAttachment(
    defineAttachment({
      id: IMPACT_CASE_ATTACHMENT_TYPE,
      schema: impactCaseAttachmentPayloadSchema,
      workflowSchema: false,
      getIcon: () => 'users',
      getLabel: () => EVIDENCE.impactTitle,
      getCreationActivity: () => ({ event: EVIDENCE.impactAdded, hideDefaultActions: true }),
      getRemovalActivity: () => ({ event: EVIDENCE.removed }),
      getAttachmentList: () => ({ children: LazyImpactList }),
    })
  );
  cases.attachmentFramework.registerAttachment(
    defineAttachment({
      id: HYPOTHESES_CASE_ATTACHMENT_TYPE,
      schema: hypothesesCaseAttachmentPayloadSchema,
      workflowSchema: false,
      getIcon: () => 'flask',
      getLabel: () => EVIDENCE.hypothesesTitle,
      getCreationActivity: () => ({ event: EVIDENCE.hypothesesAdded, hideDefaultActions: true }),
      getRemovalActivity: () => ({ event: EVIDENCE.removed }),
      getAttachmentList: () => ({ children: LazyHypothesesList }),
    })
  );

  const showDecisions = (caseData: CaseUI) =>
    isOpenCasesForInvestigationsOn() &&
    (hasDecisions(caseData) || (caseData.pendingDecisions ?? 0) > 0);

  // Only a one-line notice sits above the tabs, so a case with many decisions doesn't push the
  // tabs down; the list itself is the Decisions tab.
  cases.caseView.registerSection({
    id: 'agenticInvestigations.decisionsNotice',
    position: 'aboveTabs',
    isVisible: (caseData) => showDecisions(caseData) && (caseData.pendingDecisions ?? 0) > 0,
    render: (props) => (
      <Suspense fallback={null}>
        <LazyDecisionsNotice {...props} />
      </Suspense>
    ),
  });
  cases.caseView.registerSection({
    id: 'agenticInvestigations.decisions',
    position: 'tab',
    tabId: DECISIONS_TAB_ID,
    name: DECISIONS.title,
    isVisible: showDecisions,
    getBadgeCount: (caseData) => caseData.pendingDecisions ?? undefined,
    render: (props) => (
      <Suspense fallback={<EuiLoadingSpinner size="m" />}>
        <LazyDecisionsTab {...props} />
      </Suspense>
    ),
  });

  // The copied Impact's hosts and users join the case's Scope panel, with the setting on.
  cases.caseView.registerSection({
    id: 'agenticInvestigations.impact',
    position: 'impact',
    isVisible: () => isOpenCasesForInvestigationsOn(),
    getEntities: getImpactedEntities,
  });

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
