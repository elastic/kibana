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
import { useFullscreen } from '../../context/fullscreen';
import { appPaths } from '../../utils/app_paths';
import { newConversationId } from '../../utils/new_conversation';

const getShortcutSymbols = () => ({
  meta: isMac ? '⌘' : 'Ctrl',
  shift: '⇧',
  enter: '↵',
});

const MAX_RECENT_CONVERSATIONS = 5;
const MAX_SEARCH_RESULTS = 10;

type CommandPaletteSection =
  | 'quick'
  | 'searchResults'
  | 'conversations'
  | 'navigation'
  | 'shortcuts';

interface CommandPaletteAction {
  id: string;
  label: string;
  icon: string;
  section: CommandPaletteSection;
  shortcutDisplay?: string;
  onSelect: () => void;
}

const getSectionLabels = (hasSearchQuery: boolean): Record<CommandPaletteSection, string> => ({
  quick: i18n.translate('xpack.agentBuilder.commandPalette.section.quickActions', {
    defaultMessage: 'Quick actions',
  }),
  searchResults: i18n.translate('xpack.agentBuilder.commandPalette.section.searchResults', {
    defaultMessage: 'Search results',
  }),
  conversations: i18n.translate('xpack.agentBuilder.commandPalette.section.recentConversations', {
    defaultMessage: hasSearchQuery ? 'Conversations' : 'Recents',
  }),
  navigation: i18n.translate('xpack.agentBuilder.commandPalette.section.navigation', {
    defaultMessage: 'Actions',
  }),
  shortcuts: i18n.translate('xpack.agentBuilder.commandPalette.section.keyboardShortcuts', {
    defaultMessage: 'Keyboard shortcuts',
  }),
});

export const useCommandPaletteActions = ({
  onClose,
  searchQuery = '',
}: {
  onClose: () => void;
  searchQuery?: string;
}): EuiSelectableOption[] => {
  const { navigateToAgentBuilderUrl } = useNavigation();
  const {
    services: { application },
  } = useKibana();
  const isExperimentalFeaturesEnabled = useExperimentalFeatures();
  const hasAccessToGenAiSettings = useHasConnectorsAllPrivileges();
  const { conversations = [] } = useConversationList();
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  // Check if we're on an active conversation (not the new chat route)
  // Using window.location since we're outside the router context
  const currentPath = window.location.hash || window.location.pathname;
  const isOnConversationRoute = currentPath.includes('/conversations/');
  const isNewConversationRoute = currentPath.includes(`/conversations/${newConversationId}`);
  const hasActiveConversation = isOnConversationRoute && !isNewConversationRoute;

  const trimmedQuery = searchQuery.trim();
  const hasSearchQuery = trimmedQuery.length > 0;

  const filteredConversations = useMemo(() => {
    if (!hasSearchQuery) {
      return conversations.slice(0, MAX_RECENT_CONVERSATIONS);
    }
    const lowerQuery = trimmedQuery.toLowerCase();
    return conversations
      .filter((c) => c.title?.toLowerCase().includes(lowerQuery))
      .slice(0, MAX_SEARCH_RESULTS);
  }, [conversations, hasSearchQuery, trimmedQuery]);

  const actions = useMemo<CommandPaletteAction[]>(() => {
    const shortcutSymbols = getShortcutSymbols();

    const newChatLabel = hasSearchQuery
      ? i18n.translate('xpack.agentBuilder.commandPalette.action.newChatWithQuery', {
          defaultMessage: 'New chat "{query}"',
          values: { query: trimmedQuery },
        })
      : i18n.translate('xpack.agentBuilder.commandPalette.action.newChat', {
          defaultMessage: 'New chat',
        });

    const items: CommandPaletteAction[] = [
      // Quick Actions
      {
        id: 'new-chat',
        label: newChatLabel,
        icon: 'plusInCircle',
        section: 'quick',
        onSelect: () => {
          if (hasSearchQuery) {
            navigateToAgentBuilderUrl(appPaths.chat.new, undefined, {
              initialMessage: trimmedQuery,
            });
          } else {
            navigateToAgentBuilderUrl(appPaths.chat.new);
          }
          onClose();
        },
      },
      // Only show fullscreen option when there's an active conversation
      ...(hasActiveConversation || isFullscreen
        ? [
            {
              id: 'toggle-fullscreen',
              label: isFullscreen
                ? i18n.translate('xpack.agentBuilder.commandPalette.action.exitFullscreen', {
                    defaultMessage: 'Exit fullscreen',
                  })
                : i18n.translate('xpack.agentBuilder.commandPalette.action.fullscreenChat', {
                    defaultMessage: 'Fullscreen chat',
                  }),
              icon: isFullscreen ? 'fullScreenExit' : 'fullScreen',
              section: 'quick' as const,
              onSelect: () => {
                toggleFullscreen();
                onClose();
              },
            },
          ]
        : []),

      // Conversations (filtered when searching, recent when not)
      ...filteredConversations.map((conversation) => ({
        id: `conversation-${conversation.id}`,
        label:
          conversation.title ||
          i18n.translate('xpack.agentBuilder.commandPalette.action.untitledConversation', {
            defaultMessage: 'Untitled conversation',
          }),
        icon: 'discuss',
        section: (hasSearchQuery ? 'searchResults' : 'conversations') as CommandPaletteSection,
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
    filteredConversations,
    hasSearchQuery,
    trimmedQuery,
    hasActiveConversation,
    isFullscreen,
    toggleFullscreen,
    onClose,
  ]);

  const selectableOptions = useMemo<EuiSelectableOption[]>(() => {
    const options: EuiSelectableOption[] = [];
    const sectionLabels = getSectionLabels(hasSearchQuery);
    const lowerQuery = trimmedQuery.toLowerCase();

    // When searching, filter navigation items to match the query
    // When not searching, show all items in their respective sections
    const sections: CommandPaletteSection[] = hasSearchQuery
      ? ['quick', 'searchResults', 'navigation']
      : ['quick', 'conversations', 'navigation', 'shortcuts'];

    sections.forEach((section) => {
      let sectionActions = actions.filter((action) => action.section === section);

      // When searching, filter navigation items by label match
      if (hasSearchQuery && section === 'navigation') {
        sectionActions = sectionActions.filter((action) =>
          action.label.toLowerCase().includes(lowerQuery)
        );
      }

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
  }, [actions, hasSearchQuery, trimmedQuery]);

  return selectableOptions;
};
