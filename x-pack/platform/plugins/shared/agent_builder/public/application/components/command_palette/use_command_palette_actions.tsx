/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import { EuiIcon, EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isMac } from '@kbn/shared-ux-utility';
import React, { useMemo } from 'react';
import { useNavigation } from '../../hooks/use_navigation';
import { useKibana } from '../../hooks/use_kibana';
import { useExperimentalFeatures } from '../../hooks/use_experimental_features';
import { useHasConnectorsAllPrivileges } from '../../hooks/use_has_connectors_all_privileges';
import { useConversationList } from '../../hooks/use_conversation_list';
import { appPaths } from '../../utils/app_paths';

const getShortcutSymbols = () => ({
  meta: isMac ? '⌘' : 'Ctrl',
  shift: '⇧',
  enter: '↵',
});

const MAX_RECENT_CONVERSATIONS = 5;

type CommandPaletteSection = 'quick' | 'conversations' | 'navigation' | 'shortcuts';

interface CommandPaletteAction {
  id: string;
  label: string;
  icon: string;
  section: CommandPaletteSection;
  shortcutDisplay?: string;
  onSelect: () => void;
}

const sectionLabels: Record<CommandPaletteSection, string> = {
  quick: i18n.translate('xpack.agentBuilder.commandPalette.section.quickActions', {
    defaultMessage: 'Quick actions',
  }),
  conversations: i18n.translate('xpack.agentBuilder.commandPalette.section.recentConversations', {
    defaultMessage: 'Recents',
  }),
  navigation: i18n.translate('xpack.agentBuilder.commandPalette.section.navigation', {
    defaultMessage: 'Actions',
  }),
  shortcuts: i18n.translate('xpack.agentBuilder.commandPalette.section.keyboardShortcuts', {
    defaultMessage: 'Keyboard shortcuts',
  }),
};

export const useCommandPaletteActions = ({
  onClose,
}: {
  onClose: () => void;
}): EuiSelectableOption[] => {
  const { navigateToAgentBuilderUrl } = useNavigation();
  const {
    services: { application },
  } = useKibana();
  const isExperimentalFeaturesEnabled = useExperimentalFeatures();
  const hasAccessToGenAiSettings = useHasConnectorsAllPrivileges();
  const { conversations = [] } = useConversationList();

  const recentConversations = useMemo(() => {
    return conversations.slice(0, MAX_RECENT_CONVERSATIONS);
  }, [conversations]);

  const actions = useMemo<CommandPaletteAction[]>(() => {
    const shortcutSymbols = getShortcutSymbols();
    const items: CommandPaletteAction[] = [
      // Quick Actions
      {
        id: 'new-chat',
        label: i18n.translate('xpack.agentBuilder.commandPalette.action.newChat', {
          defaultMessage: 'New chat',
        }),
        icon: 'plus',
        section: 'quick',
        onSelect: () => {
          navigateToAgentBuilderUrl(appPaths.chat.new);
          onClose();
        },
      },

      // Recent Conversations
      ...recentConversations.map((conversation) => ({
        id: `conversation-${conversation.id}`,
        label:
          conversation.title ||
          i18n.translate('xpack.agentBuilder.commandPalette.action.untitledConversation', {
            defaultMessage: 'Untitled conversation',
          }),
        icon: 'discuss',
        section: 'conversations' as const,
        onSelect: () => {
          navigateToAgentBuilderUrl(
            appPaths.chat.conversation({ conversationId: conversation.id })
          );
          onClose();
        },
      })),

      // Navigation
      {
        id: 'nav-agents',
        label: i18n.translate('xpack.agentBuilder.commandPalette.action.agents', {
          defaultMessage: 'Agents',
        }),
        icon: 'productAgent',
        section: 'navigation',
        onSelect: () => {
          navigateToAgentBuilderUrl(appPaths.agents.list);
          onClose();
        },
      },
      {
        id: 'nav-tools',
        label: i18n.translate('xpack.agentBuilder.commandPalette.action.tools', {
          defaultMessage: 'Tools',
        }),
        icon: 'wrench',
        section: 'navigation',
        onSelect: () => {
          navigateToAgentBuilderUrl(appPaths.tools.list);
          onClose();
        },
      },
      ...(isExperimentalFeaturesEnabled
        ? [
            {
              id: 'nav-skills',
              label: i18n.translate('xpack.agentBuilder.commandPalette.action.skills', {
                defaultMessage: 'Skills',
              }),
              icon: 'bullseye',
              section: 'navigation' as const,
              onSelect: () => {
                navigateToAgentBuilderUrl(appPaths.skills.list);
                onClose();
              },
            },
          ]
        : []),
      ...(hasAccessToGenAiSettings
        ? [
            {
              id: 'nav-genai-settings',
              label: i18n.translate('xpack.agentBuilder.commandPalette.action.genAiSettings', {
                defaultMessage: 'GenAI Settings',
              }),
              icon: 'gear',
              section: 'navigation' as const,
              onSelect: () => {
                application.navigateToApp('management', { path: '/ai/genAiSettings' });
                onClose();
              },
            },
          ]
        : []),

      // Keyboard Shortcuts
      {
        id: 'shortcut-command-palette',
        label: i18n.translate('xpack.agentBuilder.commandPalette.action.quickChatOrSearch', {
          defaultMessage: 'Quick chat or search',
        }),
        icon: 'search',
        section: 'shortcuts',
        shortcutDisplay: `${shortcutSymbols.meta} K`,
        onSelect: () => {
          onClose();
        },
      },
      {
        id: 'shortcut-toggle-sidebar',
        label: i18n.translate('xpack.agentBuilder.commandPalette.action.toggleSidebar', {
          defaultMessage: 'Toggle sidebar',
        }),
        icon: 'menuLeft',
        section: 'shortcuts',
        shortcutDisplay: `${shortcutSymbols.meta} .`,
        onSelect: () => {
          // TODO: Implement sidebar toggle
          onClose();
        },
      },
      {
        id: 'shortcut-send-message',
        label: i18n.translate('xpack.agentBuilder.commandPalette.action.sendMessage', {
          defaultMessage: 'Send message',
        }),
        icon: 'returnKey',
        section: 'shortcuts',
        shortcutDisplay: shortcutSymbols.enter,
        onSelect: () => {
          onClose();
        },
      },
      {
        id: 'shortcut-toggle-thinking',
        label: i18n.translate('xpack.agentBuilder.commandPalette.action.toggleExtendedThinking', {
          defaultMessage: 'Toggle extended thinking',
        }),
        icon: 'branch',
        section: 'shortcuts',
        shortcutDisplay: `${shortcutSymbols.meta} ${shortcutSymbols.shift} E`,
        onSelect: () => {
          // TODO: Implement extended thinking toggle
          onClose();
        },
      },
    ];

    return items;
  }, [
    navigateToAgentBuilderUrl,
    application,
    isExperimentalFeaturesEnabled,
    hasAccessToGenAiSettings,
    recentConversations,
    onClose,
  ]);

  const selectableOptions = useMemo<EuiSelectableOption[]>(() => {
    const options: EuiSelectableOption[] = [];
    const sections: CommandPaletteSection[] = ['quick', 'conversations', 'navigation', 'shortcuts'];

    sections.forEach((section) => {
      const sectionActions = actions.filter((action) => action.section === section);
      if (sectionActions.length === 0) return;

      // Add section header
      options.push({
        label: sectionLabels[section],
        isGroupLabel: true,
      });

      // Add actions for this section
      sectionActions.forEach((action) => {
        options.push({
          key: action.id,
          label: action.label,
          prepend: <EuiIcon type={action.icon} size="m" aria-hidden={true} />,
          append: action.shortcutDisplay ? (
            <EuiBadge color="hollow">{action.shortcutDisplay}</EuiBadge>
          ) : undefined,
          data: { action },
          'data-test-subj': `commandPaletteAction-${action.id}`,
        });
      });
    });

    return options;
  }, [actions]);

  return selectableOptions;
};
