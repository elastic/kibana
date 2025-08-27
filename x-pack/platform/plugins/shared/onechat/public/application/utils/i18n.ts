/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const labels = {
  conversations: {
    title: i18n.translate('xpack.onechat.conversations.title', { defaultMessage: 'Conversations' }),
  },
  tools: {
    // Landing page
    title: i18n.translate('xpack.onechat.tools.title', { defaultMessage: 'Tools' }),
    description: i18n.translate('xpack.onechat.tools.toolsDescription', {
      defaultMessage:
        'Agents use tools — modular, reusable actions — to search, retrieve, and take meaningful steps on your behalf. Start with built-in capabilities from Elastic, or create your own to fit your workflow.',
    }),
    newToolButton: i18n.translate('xpack.onechat.tools.newToolButton', {
      defaultMessage: 'New tool',
    }),

    newEsqlToolTitle: i18n.translate('xpack.onechat.tools.newEsqlTool.title', {
      defaultMessage: 'New ES|QL tool',
    }),
    editEsqlToolTitle: i18n.translate('xpack.onechat.tools.editEsqlTool.title', {
      defaultMessage: 'Edit ES|QL tool',
    }),

    saveButtonLabel: i18n.translate('xpack.onechat.tools.saveButtonLabel', {
      defaultMessage: 'Save',
    }),
    clearButtonLabel: i18n.translate('xpack.onechat.tools.clearButtonLabel', {
      defaultMessage: 'Clear',
    }),
    saveButtonTooltip: i18n.translate('xpack.onechat.tools.saveButtonTooltip', {
      defaultMessage: 'Resolve all form errors to save.',
    }),

    // Table columns and labels
    toolIdLabel: i18n.translate('xpack.onechat.tools.idLabel', { defaultMessage: 'ID' }),
    typeLabel: i18n.translate('xpack.onechat.tools.typeLabel', { defaultMessage: 'Type' }),
    tagsLabel: i18n.translate('xpack.onechat.tools.tagsLabel', { defaultMessage: 'Labels' }),
    toolsLabel: i18n.translate('xpack.onechat.tools.toolsLabel', { defaultMessage: 'Tools' }),

    // Tool types
    esqlLabel: i18n.translate('xpack.onechat.tools.esqlLabel', { defaultMessage: 'ES|QL' }),
    builtinLabel: i18n.translate('xpack.onechat.tools.builtinLabel', { defaultMessage: 'System' }),

    // Actions
    editToolButtonLabel: i18n.translate('xpack.onechat.tools.editToolButtonLabel', {
      defaultMessage: 'Edit',
    }),
    deleteToolButtonLabel: i18n.translate('xpack.onechat.tools.deleteToolButtonLabel', {
      defaultMessage: 'Delete',
    }),
    testToolButtonLabel: i18n.translate('xpack.onechat.tools.testToolButtonLabel', {
      defaultMessage: 'Test',
    }),
    cloneToolButtonLabel: i18n.translate('xpack.onechat.tools.cloneToolButtonLabel', {
      defaultMessage: 'Clone',
    }),
    toolContextMenuButtonLabel: i18n.translate('xpack.onechat.tools.toolContextMenuButtonLabel', {
      defaultMessage: 'Tool context menu',
    }),

    // Table header and bulk actions
    deleteSelectedToolsButtonLabel: (count: number) =>
      i18n.translate('xpack.onechat.tools.deleteSelectedToolsButtonLabel', {
        defaultMessage: 'Delete {count, plural, one {# Tool} other {# Tools}}',
        values: { count },
      }),
    selectAllToolsButtonLabel: i18n.translate('xpack.onechat.tools.selectAllToolsButtonLabel', {
      defaultMessage: 'Select all',
    }),
    clearSelectionButtonLabel: i18n.translate('xpack.onechat.tools.clearSelectionButtonLabel', {
      defaultMessage: 'Clear selection',
    }),
    includeSystemToolsSwitchLabel: i18n.translate(
      'xpack.onechat.tools.includeSystemToolsSwitchLabel',
      {
        defaultMessage: 'Include system tools',
      }
    ),

    // Search and filters
    searchToolsPlaceholder: i18n.translate('xpack.onechat.tools.searchToolsPlaceholder', {
      defaultMessage: 'Search',
    }),
    typeFilter: i18n.translate('xpack.onechat.tools.typeFilter', { defaultMessage: 'Type' }),
    tagsFilter: i18n.translate('xpack.onechat.tools.tagsFilter', { defaultMessage: 'Labels' }),

    // Empty states and messages
    noEsqlToolsMatchMessage: i18n.translate('xpack.onechat.tools.noEsqlToolsMatchMessage', {
      defaultMessage: 'No tools match your search.',
    }),
    noEsqlToolsMessage: i18n.translate('xpack.onechat.tools.noEsqlToolsMessage', {
      defaultMessage: "It looks like you don't have any ES|QL tools defined yet.",
    }),
    listToolsErrorMessage: i18n.translate('xpack.onechat.tools.listToolsErrorMessage', {
      defaultMessage: 'Failed to fetch tools',
    }),

    // Success toasts
    deleteToolSuccessToast: (toolId: string) =>
      i18n.translate('xpack.onechat.tools.deleteToolSuccessToast', {
        defaultMessage: 'Tool "{toolId}" deleted',
        values: { toolId },
      }),
    bulkDeleteToolsSuccessToast: (count: number) =>
      i18n.translate('xpack.onechat.tools.bulkDeleteToolsSuccessToast', {
        defaultMessage: 'Deleted {count, plural, one {# tool} other {# tools}}',
        values: { count },
      }),
    createEsqlToolSuccessToast: (toolId: string) =>
      i18n.translate('xpack.onechat.tools.createEsqlToolSuccessToast', {
        defaultMessage: 'Tool "{toolId}" created',
        values: { toolId },
      }),
    editEsqlToolSuccessToast: (toolId: string) =>
      i18n.translate('xpack.onechat.tools.editEsqlToolSuccessToast', {
        defaultMessage: 'Tool "{toolId}" updated',
        values: { toolId },
      }),

    // Error toasts
    deleteToolErrorToast: (toolId: string) =>
      i18n.translate('xpack.onechat.tools.deleteToolErrorToast', {
        defaultMessage: 'Unable to delete tool "{toolId}"',
        values: { toolId },
      }),
    bulkDeleteToolsErrorToast: (count: number) =>
      i18n.translate('xpack.onechat.tools.bulkDeleteToolsErrorToast', {
        defaultMessage: 'Unable to delete {count, plural, one {# tool} other {# tools}}',
        values: { count },
      }),
    createEsqlToolErrorToast: i18n.translate('xpack.onechat.tools.createEsqlToolErrorToast', {
      defaultMessage: 'Unable to create tool',
    }),
    editEsqlToolErrorToast: (toolId: string) =>
      i18n.translate('xpack.onechat.tools.editEsqlToolErrorToast', {
        defaultMessage: 'Unable to update tool "{toolId}"',
        values: { toolId },
      }),
    searchToolsErrorToast: i18n.translate('xpack.onechat.tools.searchToolsErrorToast', {
      defaultMessage: 'Error searching tools',
    }),
    loadToolErrorToast: (toolId: string) =>
      i18n.translate('xpack.onechat.tools.loadToolErrorToast', {
        defaultMessage: 'Unable to load "{toolId}"',
        values: { toolId },
      }),
    loadToolsErrorToast: i18n.translate('xpack.onechat.tools.loadToolsErrorToast', {
      defaultMessage: 'Unable to load tools',
    }),

    // Delete modals
    deleteEsqlToolTitle: (toolId: string) =>
      i18n.translate('xpack.onechat.tools.deleteEsqlToolTitle', {
        defaultMessage: 'Delete tool "{toolId}"?',
        values: { toolId },
      }),
    deleteEsqlToolCancelButton: i18n.translate('xpack.onechat.tools.deleteEsqlToolCancelButton', {
      defaultMessage: 'Cancel',
    }),
    deleteEsqlToolConfirmButton: i18n.translate('xpack.onechat.tools.deleteEsqlToolConfirmButton', {
      defaultMessage: 'Delete',
    }),
    deleteEsqlToolConfirmationText: i18n.translate(
      'xpack.onechat.tools.deleteEsqlToolConfirmationText',
      {
        defaultMessage: "You can't recover deleted data.",
      }
    ),

    // Bulk delete modal
    bulkDeleteEsqlToolsTitle: (count: number) =>
      i18n.translate('xpack.onechat.tools.bulkDeleteEsqlToolsTitle', {
        defaultMessage: 'Delete {count, plural, one {# tool} other {# tools}}?',
        values: { count },
      }),
    bulkDeleteEsqlToolsConfirmationText: i18n.translate(
      'xpack.onechat.tools.bulkDeleteEsqlToolsConfirmationText',
      {
        defaultMessage: "You can't recover deleted data.",
      }
    ),
  },
  agents: {
    title: i18n.translate('xpack.onechat.agents.list.title', { defaultMessage: 'Agents' }),
    newAgent: i18n.translate('xpack.onechat.agents.new.title', { defaultMessage: 'New Agent' }),
    editAgent: i18n.translate('xpack.onechat.agents.edit.title', { defaultMessage: 'Edit Agent' }),
    createAgent: i18n.translate('xpack.onechat.agents.create.title', {
      defaultMessage: 'Create Agent',
    }),
    settings: {
      optionalLabel: i18n.translate('xpack.onechat.agents.form.settings.optionalLabel', {
        defaultMessage: 'Optional',
      }),
    },
  },
};
