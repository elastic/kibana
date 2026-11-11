/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useState } from 'react';
import { FormattedMessage, FormattedRelative, FormattedTime } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { EuiBadgeProps } from '@elastic/eui';
import type {
  ConversationTemplateDetailsFlyoutDescriptor,
  ConversationTemplateDetailsFlyoutModule,
  ConversationTemplateDetailsFlyoutRenderProps,
} from '@kbn/agent-builder-browser';
import type { EscalationModalRenderProps } from '../components/modals/investigation_action_modals';
import { getHeaderBlocks, type HeaderBlockValues } from '../components/details/header_blocks';
import { SEVERITY_COLORS, SEVERITY_LABELS } from '../components/details/severity';
import { DETAILS_FLYOUT_LABELS } from '../components/details/translations';
import { TEMPLATE_UI_LABELS } from './translations';
import { ACTIONS_TRANSLATIONS } from '../components/actions/translations';
import {
  conversationToEscalationHeader,
  conversationToInvestigation,
} from './conversation_to_investigation';
import type {
  EscalationDetailsFlyoutContext,
  InvestigationDetailsFlyoutContext,
  RenderAssignees,
  RenderLiveState,
  RenderSeverity,
  RenderStatus,
  TitleSlotRenderProps,
} from './types';

type Descriptor = ConversationTemplateDetailsFlyoutDescriptor;
type InfoBlocks = NonNullable<Descriptor['header']['infoBlocks']>;
type Badges = NonNullable<Descriptor['header']['badges']>;

// Unknown severity values render as-is in a hollow badge.
const BADGE_COLORS: Readonly<Record<string, EuiBadgeProps['color']>> = SEVERITY_COLORS;
const BADGE_LABELS: Readonly<Record<string, string>> = SEVERITY_LABELS;

const toInfoBlocks = (values: HeaderBlockValues): InfoBlocks =>
  getHeaderBlocks(values).map(({ id, title, value }) => ({ id, title, children: value }));

const getSinceValues = (createdAt: string) => ({
  time: <FormattedTime value={createdAt} />,
  relative: <FormattedRelative value={createdAt} />,
});

const DetailsSince = ({ createdAt }: { createdAt: string }) => (
  <FormattedMessage
    id="xpack.agenticInvestigations.detailsFlyout.header.since"
    defaultMessage="Since {time} ({relative})"
    values={getSinceValues(createdAt)}
  />
);

const EscalationSince = ({ createdAt }: { createdAt: string }) => (
  <FormattedMessage
    id="xpack.agenticInvestigations.escalationFlyout.header.since"
    defaultMessage="Since {time} ({relative})"
    values={getSinceValues(createdAt)}
  />
);

const InvestigationDescription = ({
  createdAt,
  liveStateNode,
}: {
  createdAt: string;
  liveStateNode: React.ReactNode;
}) => (
  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
    <EuiFlexItem grow={false}>
      <DetailsSince createdAt={createdAt} />
    </EuiFlexItem>
    {liveStateNode && <EuiFlexItem grow={false}>{liveStateNode}</EuiFlexItem>}
  </EuiFlexGroup>
);

const getSeverityBadges = (severity: string | undefined): Badges =>
  severity
    ? [
        {
          color: BADGE_COLORS[severity] ?? 'hollow',
          children: BADGE_LABELS[severity] ?? severity,
          'data-test-subj': 'investigationFlyoutSeverity',
        },
      ]
    : [];

const useConversationTitle = ({ title }: TitleSlotRenderProps) => title;

const useNoEscalationGate = () => true;

type EscalationModalOpenProps = Omit<EscalationModalRenderProps, 'onClose'>;

const EscalationModalContext = createContext<
  ((props: EscalationModalOpenProps) => void) | undefined
>(undefined);

/**
 * Renders the escalation modal the footer action opens. The flyout's footer is data, so the modal
 * is rendered here, around the flyout, where the module's `Provider` puts it.
 */
const EscalationModalHost = ({
  renderEscalationModal,
  children,
}: {
  renderEscalationModal: NonNullable<InvestigationDetailsFlyoutOptions['renderEscalationModal']>;
  children: React.ReactNode;
}) => {
  const [modalProps, setModalProps] = useState<EscalationModalOpenProps>();
  const closeModal = useCallback(() => setModalProps(undefined), []);
  return (
    <EscalationModalContext.Provider value={setModalProps}>
      {children}
      {modalProps && renderEscalationModal({ ...modalProps, onClose: closeModal })}
    </EscalationModalContext.Provider>
  );
};

export interface InvestigationDetailsFlyoutOptions {
  renderAssignees?: RenderAssignees;
  renderStatus?: RenderStatus;
  renderSeverity?: RenderSeverity;
  renderLiveState?: RenderLiveState;
  /** Opens the investigation's chat; offered only when the flyout was opened outside it. */
  onOpenChat: (props: { conversationId: string; agentId: string }) => void;
  /** When provided, the footer offers "Open an escalation", if the user may open one. */
  renderEscalationModal?: (props: EscalationModalRenderProps) => React.ReactNode;
  context?: InvestigationDetailsFlyoutContext;
}

/** The investigation flyout's header and footer, for Agent Builder to render. */
export const useInvestigationDetailsFlyout = (
  {
    conversation,
    isOpenedFromChat,
    refetchConversation,
  }: ConversationTemplateDetailsFlyoutRenderProps,
  {
    renderAssignees,
    renderStatus,
    renderSeverity,
    renderLiveState,
    onOpenChat,
    context,
  }: InvestigationDetailsFlyoutOptions
): Descriptor => {
  const useCanOpenEscalation = context?.useCanOpenEscalation ?? useNoEscalationGate;
  const canOpenEscalation = useCanOpenEscalation();
  const useTitle = context?.useTitle ?? useConversationTitle;
  const title = useTitle({ conversationId: conversation.id, title: conversation.title });
  const openEscalationModal = useContext(EscalationModalContext);

  const investigation = conversationToInvestigation(conversation);
  const conversationId = conversation.id;
  const statusNode = renderStatus?.({
    conversationId,
    templateId: 'investigation',
    status: investigation.status,
    refetchConversation,
  });
  // Shown once the investigation has a severity: one that never got one (AlertZero's, today) has
  // nothing to show or change.
  const severityNode =
    renderSeverity && investigation.severity
      ? renderSeverity({ conversationId, severity: investigation.severity, refetchConversation })
      : undefined;
  const assigneesNode = renderAssignees?.({
    conversationId,
    templateId: 'investigation',
    assigneeUids: investigation.assignees,
    status: investigation.status,
    refetchConversation,
  });
  const liveStateNode = renderLiveState?.({ conversationId, severity: investigation.severity });

  return {
    header: {
      title,
      description: (
        <InvestigationDescription
          createdAt={investigation.createdAt}
          liveStateNode={liveStateNode}
        />
      ),
      // A live state or a severity picker shows the severity itself, from fresher data.
      badges:
        liveStateNode === undefined && severityNode === undefined
          ? getSeverityBadges(investigation.severity)
          : [],
      infoBlocks: toInfoBlocks({
        status: investigation.status,
        statusNode,
        severityNode,
        assigneesNode,
      }),
    },
    footer: {
      ...(!isOpenedFromChat && {
        secondary: {
          variant: 'ai',
          iconType: 'productAgent',
          label: DETAILS_FLYOUT_LABELS.actions.openChat,
          onClick: () => onOpenChat({ conversationId, agentId: conversation.agent_id }),
          'data-test-subj': 'investigationFlyoutOpenChat',
        },
      }),
      ...(openEscalationModal &&
        canOpenEscalation && {
          primary: {
            iconType: 'document',
            label: ACTIONS_TRANSLATIONS.buttons.openEscalation,
            onClick: () => openEscalationModal({ mode: 'create', investigation }),
            'data-test-subj': 'investigationFlyoutOpenEscalation',
          },
        }),
    },
  };
};

const useNoEscalationSync = () => false;

export interface EscalationDetailsFlyoutOptions {
  renderAssignees?: RenderAssignees;
  renderStatus?: RenderStatus;
  context?: EscalationDetailsFlyoutContext;
}

/** The escalation flyout's header, for Agent Builder to render. Escalations have no footer. */
export const useEscalationDetailsFlyout = (
  { conversation, refetchConversation }: ConversationTemplateDetailsFlyoutRenderProps,
  { renderAssignees, renderStatus, context }: EscalationDetailsFlyoutOptions
): Descriptor => {
  const useEscalationSync = context?.useEscalationSync ?? useNoEscalationSync;
  const isSyncing = useEscalationSync(conversation.id);

  const { status, assigneeUids } = conversationToEscalationHeader(conversation);
  const conversationId = conversation.id;

  return {
    header: {
      title: conversation.title,
      description: (
        <EscalationSince createdAt={conversation.created_at} />
      ),
      isLoading: isSyncing,
      loadingLabel: TEMPLATE_UI_LABELS.syncing,
      infoBlocks: toInfoBlocks({
        status,
        statusNode: renderStatus?.({
          conversationId,
          templateId: 'escalation',
          status,
          refetchConversation,
        }),
        assigneesNode: renderAssignees?.({
          conversationId,
          templateId: 'escalation',
          assigneeUids,
          status,
          refetchConversation,
        }),
        assigneeUids,
      }),
    },
  };
};

export const createInvestigationDetailsFlyoutModule = (
  options: InvestigationDetailsFlyoutOptions
): ConversationTemplateDetailsFlyoutModule => {
  const { renderEscalationModal, context } = options;
  const ContextProvider = context?.Provider;
  const Provider = ({ children }: { children: React.ReactNode }) => {
    const content = renderEscalationModal ? (
      <EscalationModalHost renderEscalationModal={renderEscalationModal}>
        {children}
      </EscalationModalHost>
    ) : (
      children
    );
    return ContextProvider ? <ContextProvider>{content}</ContextProvider> : <>{content}</>;
  };
  return {
    Provider,
    useDetailsFlyout: (props) => useInvestigationDetailsFlyout(props, options),
  };
};

export const createEscalationDetailsFlyoutModule = (
  options: EscalationDetailsFlyoutOptions
): ConversationTemplateDetailsFlyoutModule => ({
  Provider: options.context?.Provider,
  useDetailsFlyout: (props) => useEscalationDetailsFlyout(props, options),
});
