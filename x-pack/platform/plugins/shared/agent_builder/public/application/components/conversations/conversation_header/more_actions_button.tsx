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
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';
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
import { appPaths } from '../../../utils/app_paths';
import { DeleteConversationModal } from '../delete_conversation_modal';
import { useHasConnectorsAllPrivileges } from '../../../hooks/use_has_connectors_all_privileges';
import { useUiPrivileges } from '../../../hooks/use_ui_privileges';

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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const agentId = useAgentId();
  const { createAgentBuilderUrl, navigateToAgentBuilderUrl } = useNavigation();
  const { isEmbeddedContext } = useConversationContext();
  const conversationId = useConversationId();
  const { manageAgents } = useUiPrivileges();
  const isExperimentalEnabled = useExperimentalFeatures();
  const { conversation } = useConversation();
  const conversationRounds = useConversationRounds();

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
    }).onClick();
  }, [completedRounds, conversation?.id, getAddToDatasetAction]);

  const showAddToDatasetItem =
    isExperimentalEnabled && getAddToDatasetAction != null && completedRounds.length > 0;

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

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

    navigateToAgentBuilderUrl(path);
  }, [application, agentId, conversationId, navigateToAgentBuilderUrl, onCloseSidebar]);

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
          icon="beaker"
          size="s"
          data-test-subj="agentBuilderAddConversationToDataset"
          onClick={onAddConversationToDataset}
        >
          {fullscreenLabels.addToDataset}
        </EuiContextMenuItem>,
      ]
    : [];

  const embeddedContextMenuItems = [
    <EuiContextMenuItem
      key="view-current-agent"
      icon="info"
      size="s"
      disabled={!manageAgents}
      onClick={closePopover}
      href={agentId ? createAgentBuilderUrl(appPaths.agent.overview({ agentId })) : undefined}
    >
      {fullscreenLabels.agentDetails}
    </EuiContextMenuItem>,
    ...(isEmbeddedContext && application
      ? [
          <EuiContextMenuItem
            key="full-screen"
            icon="fullScreen"
            size="s"
            disabled={!conversationId}
            data-test-subj="agentBuilderFullScreenMenuItem"
            onClick={handleOpenFullScreen}
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
          >
            {fullscreenLabels.genAiSettings}
          </EuiContextMenuItem>,
        ]
      : []),
    ...addToDatasetMenuItem,
  ];

  const fullscreenMenuItems = [
    <EuiContextMenuItem
      key="view-current-agent"
      icon="info"
      size="s"
      disabled={!manageAgents}
      onClick={closePopover}
      href={agentId ? createAgentBuilderUrl(appPaths.agent.overview({ agentId })) : undefined}
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
          >
            {fullscreenLabels.genAiSettings}
          </EuiContextMenuItem>,
        ]
      : []),
    ...addToDatasetMenuItem,
  ];

  const menuItems = isEmbeddedContext ? embeddedContextMenuItems : fullscreenMenuItems;

  const buttonProps = {
    iconType: 'boxesVertical' as const,
    color: 'text' as const,
    size: 'm' as const,
    'aria-label': fullscreenLabels.actionsAriaLabel,
    onClick: togglePopover,
    'data-test-subj': 'agentBuilderMoreActionsButton',
  };

  return (
    <>
      <EuiPopover
        button={<EuiButtonIcon {...buttonProps} />}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="xs"
        anchorPosition="downCenter"
        aria-label={fullscreenLabels.actionsAriaLabel}
      >
        <EuiContextMenuPanel size="s" items={menuItems} />
        <EuiSpacer size="s" />
      </EuiPopover>
      <DeleteConversationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </>
  );
};
