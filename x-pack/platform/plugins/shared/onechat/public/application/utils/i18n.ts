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
    toolsTableCaption: (toolsCount: number) =>
      i18n.translate('xpack.onechat.tools.toolsTableCaption', {
        defaultMessage: 'Available tools for AI agents: {toolsCount} tools',
        values: { toolsCount },
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
    mcpLabel: i18n.translate('xpack.onechat.tools.mcpLabel', { defaultMessage: 'MCP' }),
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

    // MCP tool health status
    mcpHealthStatus: {
      toolNotFound: {
        title: i18n.translate('xpack.onechat.tools.mcpHealthStatus.toolNotFound.title', {
          defaultMessage: 'Tool not found on MCP server',
        }),
        description: i18n.translate(
          'xpack.onechat.tools.mcpHealthStatus.toolNotFound.description',
          {
            defaultMessage: 'It may have been removed or renamed.',
          }
        ),
      },
      connectorNotFound: {
        title: i18n.translate('xpack.onechat.tools.mcpHealthStatus.connectorNotFound.title', {
          defaultMessage: 'MCP connector unavailable',
        }),
        description: i18n.translate(
          'xpack.onechat.tools.mcpHealthStatus.connectorNotFound.description',
          {
            defaultMessage: 'Check your MCP server connection',
          }
        ),
      },
      listToolsFailed: {
        title: i18n.translate('xpack.onechat.tools.mcpHealthStatus.listToolsFailed.title', {
          defaultMessage: "Can't retrieve tools from MCP server",
        }),
        description: i18n.translate(
          'xpack.onechat.tools.mcpHealthStatus.listToolsFailed.description',
          {
            defaultMessage: 'Check your MCP server connection',
          }
        ),
      },
      toolUnhealthy: {
        title: i18n.translate('xpack.onechat.tools.mcpHealthStatus.toolUnhealthy.title', {
          defaultMessage: 'Tool execution failed',
        }),
        description: i18n.translate(
          'xpack.onechat.tools.mcpHealthStatus.toolUnhealthy.description',
          {
            defaultMessage: 'Check your MCP server connection',
          }
        ),
      },
    },

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

    // Bulk import MCP tools
    bulkImportMcp: {
      title: i18n.translate('xpack.onechat.tools.bulkImportMcp.title', {
        defaultMessage: 'Bulk import MCP tools',
      }),
      description: i18n.translate('xpack.onechat.tools.bulkImportMcp.description', {
        defaultMessage:
          'Select an MCP server and import multiple tools at once to make them available in Agent Builder.',
      }),
      importToolsButton: i18n.translate('xpack.onechat.tools.bulkImportMcp.importToolsButton', {
        defaultMessage: 'Import tools',
      }),
      cancelButton: i18n.translate('xpack.onechat.tools.bulkImportMcp.cancelButton', {
        defaultMessage: 'Cancel',
      }),
      sourceSection: {
        title: i18n.translate('xpack.onechat.tools.bulkImportMcp.sourceSection.title', {
          defaultMessage: 'Source',
        }),
        description: i18n.translate('xpack.onechat.tools.bulkImportMcp.sourceSection.description', {
          defaultMessage: 'Select the MCP server and preview the tools available for import.',
        }),
        mcpServerLabel: i18n.translate(
          'xpack.onechat.tools.bulkImportMcp.sourceSection.mcpServerLabel',
          {
            defaultMessage: 'MCP Server',
          }
        ),
        addMcpServerLink: i18n.translate(
          'xpack.onechat.tools.bulkImportMcp.sourceSection.addMcpServerLink',
          {
            defaultMessage: 'Add a new MCP server',
          }
        ),
        toolsToImportLabel: i18n.translate(
          'xpack.onechat.tools.bulkImportMcp.sourceSection.toolsToImportLabel',
          {
            defaultMessage: 'Tools to import',
          }
        ),
        nameColumn: i18n.translate('xpack.onechat.tools.bulkImportMcp.sourceSection.nameColumn', {
          defaultMessage: 'Name',
        }),
        searchPlaceholder: i18n.translate(
          'xpack.onechat.tools.bulkImportMcp.sourceSection.searchPlaceholder',
          {
            defaultMessage: 'Search tools',
          }
        ),
        selectedCount: (selected: number) =>
          i18n.translate('xpack.onechat.tools.bulkImportMcp.sourceSection.selectedCount', {
            defaultMessage: '{selected} Selected',
            values: { selected },
          }),
        clearSelection: i18n.translate(
          'xpack.onechat.tools.bulkImportMcp.sourceSection.clearSelection',
          {
            defaultMessage: 'Clear selection',
          }
        ),
        selectMcpServerMessage: i18n.translate(
          'xpack.onechat.tools.bulkImportMcp.sourceSection.selectMcpServerMessage',
          {
            defaultMessage: 'Select an MCP server to see available tools.',
          }
        ),
        noToolsMessage: i18n.translate(
          'xpack.onechat.tools.bulkImportMcp.sourceSection.noToolsMessage',
          {
            defaultMessage: 'No tools found on the selected MCP server.',
          }
        ),
        noMatchingToolsMessage: i18n.translate(
          'xpack.onechat.tools.bulkImportMcp.sourceSection.noMatchingToolsMessage',
          {
            defaultMessage: 'No tools match your search.',
          }
        ),
        loadingToolsMessage: i18n.translate(
          'xpack.onechat.tools.bulkImportMcp.sourceSection.loadingToolsMessage',
          {
            defaultMessage: 'Loading tools...',
          }
        ),
        toolsErrorMessage: i18n.translate(
          'xpack.onechat.tools.bulkImportMcp.sourceSection.toolsErrorMessage',
          {
            defaultMessage: 'Failed to load tools from the selected MCP server.',
          }
        ),
        tableCaption: i18n.translate(
          'xpack.onechat.tools.bulkImportMcp.sourceSection.tableCaption',
          {
            defaultMessage: 'MCP tools available for import',
          }
        ),
      },
      organizationSection: {
        title: i18n.translate('xpack.onechat.tools.bulkImportMcp.organizationSection.title', {
          defaultMessage: 'Organization',
        }),
        description: i18n.translate(
          'xpack.onechat.tools.bulkImportMcp.organizationSection.description',
          {
            defaultMessage: 'Choose how imported tools should be grouped and labeled.',
          }
        ),
        namespaceLabel: i18n.translate(
          'xpack.onechat.tools.bulkImportMcp.organizationSection.namespaceLabel',
          {
            defaultMessage: 'Namespace',
          }
        ),
        namespaceHelpText: i18n.translate(
          'xpack.onechat.tools.bulkImportMcp.organizationSection.namespaceHelpText',
          {
            defaultMessage: 'Minimum 1 character',
          }
        ),
        labelsLabel: i18n.translate(
          'xpack.onechat.tools.bulkImportMcp.organizationSection.labelsLabel',
          {
            defaultMessage: 'Labels',
          }
        ),
      },
      importSuccessToast: (count: number) =>
        i18n.translate('xpack.onechat.tools.bulkImportMcp.importSuccessToast', {
          defaultMessage: 'Successfully imported {count, plural, one {# tool} other {# tools}}',
          values: { count },
        }),
      importErrorToast: i18n.translate('xpack.onechat.tools.bulkImportMcp.importErrorToast', {
        defaultMessage: 'Failed to import MCP tools',
      }),
      noToolsSelectedError: i18n.translate(
        'xpack.onechat.tools.bulkImportMcp.noToolsSelectedError',
        {
          defaultMessage: 'Please select at least one tool to import.',
        }
      ),
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
};
