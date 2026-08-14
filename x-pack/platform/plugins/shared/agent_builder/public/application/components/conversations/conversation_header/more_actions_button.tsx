/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiContextMenuItem,
  EuiButtonIcon,
  EuiPopover,
  EuiContextMenuPanel,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { useNavigation } from '../../../hooks/use_navigation';
import {
  useAgentId,
  useConversation,
  useConversationRounds,
} from '../../../hooks/use_conversation';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { useExperimentalFeatures } from '../../../hooks/use_experimental_features';
import { useKibana } from '../../../hooks/use_kibana';
import { useTracingEnabled } from '../../../hooks/use_tracing_enabled';
import { appPaths } from '../../../utils/app_paths';
import { useHasConnectorsAllPrivileges } from '../../../hooks/use_has_connectors_all_privileges';
import { useUiPrivileges } from '../../../hooks/use_ui_privileges';
import { ConversationTracesFlyout } from '../../traces/conversation_traces_flyout';
import { labels as sharedLabels } from '../../../utils/i18n';

const fullscreenLabels = {
  actions: i18n.translate('xpack.agentBuilder.conversationActions.actions', {
    defaultMessage: 'More',
  }),
  actionsAriaLabel: i18n.translate('xpack.agentBuilder.conversationActions.actionsAriaLabel', {
    defaultMessage: 'More',
  }),
  agentDetails: i18n.translate('xpack.agentBuilder.conversationActions.agentDetails', {
    defaultMessage: 'Agent details',
  }),
  genAiSettings: i18n.translate('xpack.agentBuilder.conversationActions.genAiSettings', {
    defaultMessage: 'GenAI Settings',
  }),
  externalLinkAriaLabel: i18n.translate(
    'xpack.agentBuilder.conversationActions.externalLinkAriaLabel',
    {
      defaultMessage: 'Open in new tab',
    }
  ),
  view: i18n.translate('xpack.agentBuilder.conversationActions.viewSection', {
    defaultMessage: 'View',
  }),
  fullScreen: i18n.translate('xpack.agentBuilder.conversationActions.fullScreen', {
    defaultMessage: 'Open in full screen',
  }),
  fullScreenDisabledTooltip: i18n.translate(
    'xpack.agentBuilder.conversationActions.fullScreenDisabledTooltip',
    {
      defaultMessage: 'Full-screen mode is available once this conversation has been created.',
    }
  ),
  addToDataset: i18n.translate('xpack.agentBuilder.conversationActions.addToDataset', {
    defaultMessage: 'Add conversation to dataset',
  }),
  emptyMessage: i18n.translate('xpack.agentBuilder.conversationActions.emptyMessage', {
    defaultMessage: '(no message)',
  }),
};

interface MoreActionsButtonProps {
  onCloseSidebar?: () => void;
}

export const MoreActionsButton: React.FC<MoreActionsButtonProps> = ({ onCloseSidebar }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isTracesFlyoutOpen, setIsTracesFlyoutOpen] = useState(false);

  const agentId = useAgentId();
  const { createAgentBuilderUrl, navigateToAgentBuilderUrl } = useNavigation();
  const { isEmbeddedContext } = useConversationContext();
  const conversationId = useConversationId();
  const { manageAgents } = useUiPrivileges();
  const isExperimentalEnabled = useExperimentalFeatures();
  const { conversation } = useConversation();
  const conversationRounds = useConversationRounds();
  const isTracingEnabled = useTracingEnabled();

  const {
    services: { application, plugins },
  } = useKibana();
  const hasAccessToGenAiSettings = useHasConnectorsAllPrivileges();

  const getAddToDatasetAction = plugins.evals?.getAddToDatasetAction;

  const completedRounds = useMemo(() => {
    return conversationRounds.flatMap((round, roundIndex) => {
      if (!round.response?.message) return [];
      return [{ round, roundIndex }];
    });
  }, [conversationRounds]);

  const onAddConversationToDataset = useCallback(() => {
    if (!getAddToDatasetAction) return;

    setIsPopoverOpen(false);
    getAddToDatasetAction({
      label: fullscreenLabels.addToDataset,
      title: fullscreenLabels.addToDataset,
      initialExamples: completedRounds.map(({ round, roundIndex }) => {
        const message =
          typeof round.input?.message === 'string' && round.input.message.trim()
            ? round.input.message.trim()
            : fullscreenLabels.emptyMessage;

        const shortMessage = message.length > 80 ? `${message.slice(0, 77).trimEnd()}…` : message;

        const traceId =
          round.trace_id == null
            ? null
            : Array.isArray(round.trace_id)
            ? round.trace_id[0] ?? null
            : round.trace_id;

        return {
          label: i18n.translate('xpack.agentBuilder.conversationActions.turnLabel', {
            defaultMessage: 'Turn {turn}: {message}',
            values: { turn: roundIndex + 1, message: shortMessage },
          }),
          input: { round },
          output: { steps: round.steps },
          metadata: {
            source: 'agent_builder',
            conversation_id: conversation?.id ?? null,
            turn_index: roundIndex,
            trace_id: traceId,
          },
          selected: true,
        };
      }),
    })?.onClick();
  }, [completedRounds, conversation?.id, getAddToDatasetAction]);

  const showAddToDatasetItem =
    isExperimentalEnabled && plugins.evals?.canAddToDataset && completedRounds.length > 0;

  // Only surface the "View all traces" menu item when tracing is enabled AND at
  // least one round in this conversation actually has a trace to show — otherwise
  // the flyout would open with an unhelpful empty state.
  const hasAnyTrace = useMemo(
    () =>
      conversationRounds.some((round) => {
        const traceId = Array.isArray(round.trace_id) ? round.trace_id[0] : round.trace_id;
        return Boolean(traceId);
      }),
    [conversationRounds]
  );
  const showViewAllTracesItem = isTracingEnabled && hasAnyTrace;

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const openTracesFlyout = useCallback(() => {
    setIsPopoverOpen(false);
    setIsTracesFlyoutOpen(true);
  }, []);

  const closeTracesFlyout = useCallback(() => {
    setIsTracesFlyoutOpen(false);
  }, []);

  const togglePopover = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const handleOpenFullScreen = useCallback(() => {
    if (!application) return;
    if (!conversationId) return;

    setIsPopoverOpen(false);
    onCloseSidebar?.();

    const path = conversationId
      ? appPaths.agent.conversations.byId({ agentId: agentId!, conversationId: conversationId! })
      : appPaths.agent.conversations.new({ agentId: agentId! });

    navigateToAgentBuilderUrl(path, undefined, { entryPointSource: 'inapp_escalation' });
  }, [application, conversationId, onCloseSidebar, agentId, navigateToAgentBuilderUrl]);

  const fullScreenMenuItemLabel = useMemo(() => {
    if (conversationId) {
      return fullscreenLabels.fullScreen;
    }
    return (
      <EuiToolTip content={fullscreenLabels.fullScreenDisabledTooltip}>
        <span tabIndex={0}>{fullscreenLabels.fullScreen}</span>
      </EuiToolTip>
    );
  }, [conversationId]);

  const addToDatasetMenuItem = showAddToDatasetItem
    ? [
        <EuiContextMenuItem
          key="addConversationToDataset"
          icon="flask"
          data-test-subj="agentBuilderAddConversationToDataset"
          onClick={onAddConversationToDataset}
          {...getEbtProps({
            element: AGENT_BUILDER_UI_EBT.element.pageContent,
            action: AGENT_BUILDER_UI_EBT.action.conversation.ADD_TO_DATASET,
            detail: 'conversation',
          })}
        >
          {fullscreenLabels.addToDataset}
        </EuiContextMenuItem>,
      ]
    : [];

  // Reuses the existing VIEW_TRACE EBT action rather than defining a new id — this is
  // still a "view trace" affordance, just scoped to the whole conversation instead of a
  // single round. The `conversation_all` detail keeps it distinguishable from the
  // per-round trace button (which reports `conversation`) in telemetry.
  const viewAllTracesMenuItem = showViewAllTracesItem
    ? [
        <EuiContextMenuItem
          key="conversationTraces"
          icon="chartWaterfall"
          data-test-subj="agentBuilderViewConversationTracesButton"
          onClick={openTracesFlyout}
          {...getEbtProps({
            element: AGENT_BUILDER_UI_EBT.element.pageContent,
            action: AGENT_BUILDER_UI_EBT.action.conversation.VIEW_TRACE,
            detail: 'conversation_all',
          })}
        >
          {sharedLabels.traces.conversationTracesMenuItem}
        </EuiContextMenuItem>,
      ]
    : [];

  const embeddedContextMenuItems = [
    <EuiContextMenuItem
      key="view-current-agent"
      icon="info"
      disabled={!manageAgents}
      onClick={closePopover}
      href={agentId ? createAgentBuilderUrl(appPaths.agent.overview({ agentId })) : undefined}
      {...getEbtProps({
        element: AGENT_BUILDER_UI_EBT.element.pageContent,
        action: AGENT_BUILDER_UI_EBT.action.conversation.AGENT_DETAILS,
        detail: 'conversation',
      })}
    >
      {fullscreenLabels.agentDetails}
    </EuiContextMenuItem>,
    ...(isEmbeddedContext && application
      ? [
          <EuiContextMenuItem
            key="full-screen"
            icon="fullScreen"
            disabled={!conversationId}
            data-test-subj="agentBuilderFullScreenMenuItem"
            onClick={handleOpenFullScreen}
            {...getEbtProps({
              element: AGENT_BUILDER_UI_EBT.element.pageContent,
              action: AGENT_BUILDER_UI_EBT.action.inappChat.OPEN_FULLSCREEN,
            })}
          >
            {fullScreenMenuItemLabel}
          </EuiContextMenuItem>,
        ]
      : []),
    ...(hasAccessToGenAiSettings
      ? [
          <EuiContextMenuItem
            key="agentBuilderSettings"
            icon="gear"
            onClick={closePopover}
            href={application.getUrlForApp('management', { path: '/ai/genAiSettings' })}
            data-test-subj="agentBuilderGenAiSettingsButton"
            {...getEbtProps({
              element: AGENT_BUILDER_UI_EBT.element.pageContent,
              action: AGENT_BUILDER_UI_EBT.action.conversation.GENAI_SETTINGS,
              detail: 'conversation',
            })}
          >
            {fullscreenLabels.genAiSettings}
          </EuiContextMenuItem>,
        ]
      : []),
    ...viewAllTracesMenuItem,
    ...addToDatasetMenuItem,
  ];

  const fullscreenMenuItems = [
    <EuiContextMenuItem
      key="view-current-agent"
      icon="info"
      disabled={!manageAgents}
      onClick={closePopover}
      href={agentId ? createAgentBuilderUrl(appPaths.agent.overview({ agentId })) : undefined}
      {...getEbtProps({
        element: AGENT_BUILDER_UI_EBT.element.pageContent,
        action: AGENT_BUILDER_UI_EBT.action.conversation.AGENT_DETAILS,
        detail: 'conversation',
      })}
    >
      {fullscreenLabels.agentDetails}
    </EuiContextMenuItem>,
    ...(hasAccessToGenAiSettings
      ? [
          <EuiContextMenuItem
            key="agentBuilderSettings"
            icon="gear"
            onClick={closePopover}
            href={application.getUrlForApp('management', { path: '/ai/genAiSettings' })}
            data-test-subj="agentBuilderGenAiSettingsButton"
            {...getEbtProps({
              element: AGENT_BUILDER_UI_EBT.element.pageContent,
              action: AGENT_BUILDER_UI_EBT.action.conversation.GENAI_SETTINGS,
              detail: 'conversation',
            })}
          >
            {fullscreenLabels.genAiSettings}
          </EuiContextMenuItem>,
        ]
      : []),
    ...viewAllTracesMenuItem,
    ...addToDatasetMenuItem,
  ];

  const menuItems = isEmbeddedContext ? embeddedContextMenuItems : fullscreenMenuItems;

  const buttonProps = {
    iconType: 'boxesVertical' as const,
    color: 'text' as const,
    size: 's' as const,
    'aria-label': fullscreenLabels.actionsAriaLabel,
    onClick: togglePopover,
    'data-test-subj': 'agentBuilderMoreActionsButton',
    ...getEbtProps({
      element: AGENT_BUILDER_UI_EBT.element.pageContent,
      action: AGENT_BUILDER_UI_EBT.action.conversation.OPEN_MORE_ACTIONS,
      detail: 'conversation',
    }),
  };

  return (
    <>
      <EuiPopover
        button={<EuiButtonIcon {...buttonProps} />}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downRight"
        aria-label={fullscreenLabels.actionsAriaLabel}
      >
        <EuiContextMenuPanel items={menuItems} />
      </EuiPopover>
      {isTracesFlyoutOpen && (
        <ConversationTracesFlyout rounds={conversationRounds} onClose={closeTracesFlyout} />
      )}
    </>
  );
};
