/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const labels = {
  common: {
    optional: i18n.translate('xpack.onechat.common.optional', {
      defaultMessage: 'Optional',
    }),
  },
  conversations: {
    title: i18n.translate('xpack.onechat.conversations.title', { defaultMessage: 'Agent Chat' }),
    manageAgents: i18n.translate('xpack.onechat.agents.manageAgents', {
      defaultMessage: 'Manage agents',
    }),
    createAnAgent: i18n.translate('xpack.onechat.agents.createAnAgent', {
      defaultMessage: 'Create an agent',
    }),
    selectAgentAriaLabel: i18n.translate('xpack.onechat.agents.selectAgentAriaLabel', {
      defaultMessage: 'Select an agent',
    }),
  },
  tools: {
    // Landing page
    title: i18n.translate('xpack.onechat.tools.title', { defaultMessage: 'Tools' }),
    newToolButton: i18n.translate('xpack.onechat.tools.newToolButton', {
      defaultMessage: 'New tool',
    }),
    newToolTitle: i18n.translate('xpack.onechat.tools.newToolTitle', {
      defaultMessage: 'Create a new tool',
    }),
    readOnly: i18n.translate('xpack.onechat.tools.readOnly', {
      defaultMessage: 'Read-only',
    }),
    newIndexSearchToolTitle: i18n.translate('xpack.onechat.tools.newIndexSearchTool.title', {
      defaultMessage: 'New index search tool',
    }),
    editIndexSearchToolTitle: i18n.translate('xpack.onechat.tools.editIndexSearchTool.title', {
      defaultMessage: 'Edit index search tool',
    }),

    editToolContextMenuButtonLabel: i18n.translate(
      'xpack.onechat.tools.editToolContextMenuButtonLabel',
      {
        defaultMessage: 'Edit tool context menu',
      }
    ),
    saveButtonLabel: i18n.translate('xpack.onechat.tools.saveButtonLabel', {
      defaultMessage: 'Save',
    }),
    testButtonLabel: i18n.translate('xpack.onechat.tools.testButtonLabel', {
      defaultMessage: 'Test',
    }),
    saveAndTestButtonLabel: i18n.translate('xpack.onechat.tools.saveAndTestButtonLabel', {
      defaultMessage: 'Save & test',
    }),
    cancelButtonLabel: i18n.translate('xpack.onechat.tools.cancelButtonLabel', {
      defaultMessage: 'Cancel',
    }),
    saveButtonTooltip: i18n.translate('xpack.onechat.tools.saveButtonTooltip', {
      defaultMessage: 'Resolve all form errors to save.',
    }),

    // Table columns and labels
    toolIdLabel: i18n.translate('xpack.onechat.tools.idLabel', { defaultMessage: 'ID' }),
    tagsLabel: i18n.translate('xpack.onechat.tools.tagsLabel', { defaultMessage: 'Labels' }),
    toolsLabel: i18n.translate('xpack.onechat.tools.toolsLabel', { defaultMessage: 'Tools' }),

    // Tool types
    esqlLabel: i18n.translate('xpack.onechat.tools.esqlLabel', { defaultMessage: 'ES|QL' }),
    builtinLabel: i18n.translate('xpack.onechat.tools.builtinLabel', { defaultMessage: 'System' }),
    searchLabel: i18n.translate('xpack.onechat.tools.searchLabel', { defaultMessage: 'Search' }),
    indexTypeLabel: i18n.translate('xpack.onechat.tools.indexTypeLabel', {
      defaultMessage: 'Index',
    }),
    aliasTypeLabel: i18n.translate('xpack.onechat.tools.aliasTypeLabel', {
      defaultMessage: 'Alias',
    }),
    dataStreamTypeLabel: i18n.translate('xpack.onechat.tools.dataStreamTypeLabel', {
      defaultMessage: 'Data stream',
    }),

    // Actions
    editToolButtonLabel: i18n.translate('xpack.onechat.tools.editToolButtonLabel', {
      defaultMessage: 'Edit',
    }),
    viewToolButtonLabel: i18n.translate('xpack.onechat.tools.viewToolButtonLabel', {
      defaultMessage: 'View',
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
    createIndexSearchToolSuccessToast: (toolId: string) =>
      i18n.translate('xpack.onechat.tools.createIndexSearchToolSuccessToast', {
        defaultMessage: 'Tool "{toolId}" created',
        values: { toolId },
      }),
    editIndexSearchToolSuccessToast: (toolId: string) =>
      i18n.translate('xpack.onechat.tools.editIndexSearchToolSuccessToast', {
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
        defaultMessage: 'Delete {toolId}?',
        values: { toolId },
      }),
    deleteEsqlToolCancelButton: i18n.translate('xpack.onechat.tools.deleteEsqlToolCancelButton', {
      defaultMessage: 'Cancel',
    }),
    deleteEsqlToolConfirmButton: i18n.translate('xpack.onechat.tools.deleteEsqlToolConfirmButton', {
      defaultMessage: 'Delete tool',
    }),
    deleteEsqlToolConfirmationText: i18n.translate(
      'xpack.onechat.tools.deleteEsqlToolConfirmationText',
      {
        defaultMessage: 'This action will permanently remove the tool. This cannot be undone.',
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
    testTool: {
      backToEditToolButton: i18n.translate('xpack.onechat.tools.testTool.backToEditToolButton', {
        defaultMessage: 'Back to edit tool',
      }),
    },
  },
  agents: {
    title: i18n.translate('xpack.onechat.agents.list.title', { defaultMessage: 'Agents' }),
    newAgent: i18n.translate('xpack.onechat.agents.new.title', { defaultMessage: 'New Agent' }),
    editAgent: i18n.translate('xpack.onechat.agents.edit.title', { defaultMessage: 'Edit Agent' }),
    createAgent: i18n.translate('xpack.onechat.agents.create.title', {
      defaultMessage: 'Create Agent',
    }),
    settings: {
      cancelButtonLabel: i18n.translate('xpack.onechat.agents.form.settings.cancelButtonLabel', {
        defaultMessage: 'Cancel',
      }),
    },
  },
  management: {
    agentBuilder: i18n.translate('xpack.onechat.management.agentBuilder.title', {
      defaultMessage: 'Agent Builder',
    }),
  },
  navigationAbort: {
    title: i18n.translate('xpack.onechat.navigationAbort.title', {
      defaultMessage: 'Abort chat request?',
    }),
    message: i18n.translate('xpack.onechat.navigationAbort.message', {
      defaultMessage: 'A chat request is in progress. Do you want to navigate away and abort it?',
    }),
    confirmButton: i18n.translate('xpack.onechat.navigationAbort.confirmButton', {
      defaultMessage: 'Yes, abort',
    }),
  },
  monitoring: {
    title: i18n.translate('xpack.onechat.monitoring.title', {
      defaultMessage: 'Agent Builder Monitoring',
    }),
    detailTitle: i18n.translate('xpack.onechat.monitoring.detailTitle', {
      defaultMessage: 'Conversation Trace',
    }),
    // Filters
    timeRangeLabel: i18n.translate('xpack.onechat.monitoring.timeRangeLabel', {
      defaultMessage: 'Time range',
    }),
    userFilterLabel: i18n.translate('xpack.onechat.monitoring.userFilterLabel', {
      defaultMessage: 'Filter by user',
    }),
    startDateLabel: i18n.translate('xpack.onechat.monitoring.startDateLabel', {
      defaultMessage: 'Start date',
    }),
    endDateLabel: i18n.translate('xpack.onechat.monitoring.endDateLabel', {
      defaultMessage: 'End date',
    }),
    // Aggregate metrics
    totalTokensIn: i18n.translate('xpack.onechat.monitoring.totalTokensIn', {
      defaultMessage: 'Total tokens in',
    }),
    totalTokensOut: i18n.translate('xpack.onechat.monitoring.totalTokensOut', {
      defaultMessage: 'Total tokens out',
    }),
    totalMessages: i18n.translate('xpack.onechat.monitoring.totalMessages', {
      defaultMessage: 'Total messages',
    }),
    totalToolCalls: i18n.translate('xpack.onechat.monitoring.totalToolCalls', {
      defaultMessage: 'Total tool calls',
    }),
    // Table columns
    conversationLabel: i18n.translate('xpack.onechat.monitoring.conversationLabel', {
      defaultMessage: 'Conversation',
    }),
    createdAtLabel: i18n.translate('xpack.onechat.monitoring.createdAtLabel', {
      defaultMessage: 'Created',
    }),
    authorLabel: i18n.translate('xpack.onechat.monitoring.authorLabel', {
      defaultMessage: 'Author',
    }),
    agentLabel: i18n.translate('xpack.onechat.monitoring.agentLabel', {
      defaultMessage: 'Agent',
    }),
    tokensInLabel: i18n.translate('xpack.onechat.monitoring.tokensInLabel', {
      defaultMessage: 'Tokens in',
    }),
    tokensOutLabel: i18n.translate('xpack.onechat.monitoring.tokensOutLabel', {
      defaultMessage: 'Tokens out',
    }),
    roundsLabel: i18n.translate('xpack.onechat.monitoring.roundsLabel', {
      defaultMessage: 'Rounds',
    }),
    // Detail view
    userInputLabel: i18n.translate('xpack.onechat.monitoring.userInputLabel', {
      defaultMessage: 'User input',
    }),
    toolExecutionLabel: i18n.translate('xpack.onechat.monitoring.toolExecutionLabel', {
      defaultMessage: 'Tool calls',
    }),
    agentResponseLabel: i18n.translate('xpack.onechat.monitoring.agentResponseLabel', {
      defaultMessage: 'Agent response',
    }),
    toolNameLabel: i18n.translate('xpack.onechat.monitoring.toolNameLabel', {
      defaultMessage: 'Tool',
    }),
    inputParametersLabel: i18n.translate('xpack.onechat.monitoring.inputParametersLabel', {
      defaultMessage: 'Input parameters',
    }),
    outputResultLabel: i18n.translate('xpack.onechat.monitoring.outputResultLabel', {
      defaultMessage: 'Output',
    }),
    tokenConsumptionLabel: i18n.translate('xpack.onechat.monitoring.tokenConsumptionLabel', {
      defaultMessage: 'Token consumption',
    }),
    metadataLabel: i18n.translate('xpack.onechat.monitoring.metadataLabel', {
      defaultMessage: 'Metadata',
    }),
    connectorLabel: i18n.translate('xpack.onechat.monitoring.connectorLabel', {
      defaultMessage: 'Connector',
    }),
    connectorUsageLabel: i18n.translate('xpack.onechat.monitoring.connectorUsageLabel', {
      defaultMessage: 'Connector usage breakdown',
    }),
    roundLabel: (roundNumber: number) =>
      i18n.translate('xpack.onechat.monitoring.roundLabel', {
        defaultMessage: 'Round {roundNumber}',
        values: { roundNumber },
      }),
    inputTokensLabel: i18n.translate('xpack.onechat.monitoring.inputTokensLabel', {
      defaultMessage: 'Input tokens',
    }),
    outputTokensLabel: i18n.translate('xpack.onechat.monitoring.outputTokensLabel', {
      defaultMessage: 'Output tokens',
    }),
    totalInputTokensLabel: i18n.translate('xpack.onechat.monitoring.totalInputTokensLabel', {
      defaultMessage: 'Total input tokens',
    }),
    totalOutputTokensLabel: i18n.translate('xpack.onechat.monitoring.totalOutputTokensLabel', {
      defaultMessage: 'Total output tokens',
    }),
    startedAtLabel: i18n.translate('xpack.onechat.monitoring.startedAtLabel', {
      defaultMessage: 'Started at',
    }),
    timeToFirstTokenLabel: i18n.translate('xpack.onechat.monitoring.timeToFirstTokenLabel', {
      defaultMessage: 'Time to first token',
    }),
    timeToLastTokenLabel: i18n.translate('xpack.onechat.monitoring.timeToLastTokenLabel', {
      defaultMessage: 'Total duration',
    }),
    secondsLabel: (seconds: number) =>
      i18n.translate('xpack.onechat.monitoring.secondsLabel', {
        defaultMessage: '{seconds}s',
        values: { seconds },
      }),
    timingBreakdownLabel: i18n.translate('xpack.onechat.monitoring.timingBreakdownLabel', {
      defaultMessage: 'Timing breakdown',
    }),
    generationTimeLabel: i18n.translate('xpack.onechat.monitoring.generationTimeLabel', {
      defaultMessage: 'Generation time',
    }),
    backToListLabel: i18n.translate('xpack.onechat.monitoring.backToListLabel', {
      defaultMessage: 'Back to conversations',
    }),
    // Error messages
    loadErrorMessage: i18n.translate('xpack.onechat.monitoring.loadErrorMessage', {
      defaultMessage: 'Failed to load monitoring data',
    }),
    loadConversationErrorMessage: i18n.translate(
      'xpack.onechat.monitoring.loadConversationErrorMessage',
      {
        defaultMessage: 'Failed to load conversation',
      }
    ),
  },
};
