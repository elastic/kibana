/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const labels = {
  common: {
    optional: i18n.translate('xpack.agentBuilder.common.optional', {
      defaultMessage: 'Optional',
    }),
  },
  conversations: {
    title: i18n.translate('xpack.agentBuilder.conversations.title', {
      defaultMessage: 'Agent Chat',
    }),
  },
  tools: {
    // Landing page
    title: i18n.translate('xpack.agentBuilder.tools.title', { defaultMessage: 'Tools' }),
    newToolButton: i18n.translate('xpack.agentBuilder.tools.newToolButton', {
      defaultMessage: 'New tool',
    }),
    newToolTitle: i18n.translate('xpack.agentBuilder.tools.newToolTitle', {
      defaultMessage: 'Create a new tool',
    }),
    readOnly: i18n.translate('xpack.agentBuilder.tools.readOnly', {
      defaultMessage: 'Read-only',
    }),
    toolsTableCaption: (toolsCount: number) =>
      i18n.translate('xpack.agentBuilder.tools.toolsTableCaption', {
        defaultMessage: 'Available tools for AI agents: {toolsCount} tools',
        values: { toolsCount },
      }),
    newIndexSearchToolTitle: i18n.translate('xpack.agentBuilder.tools.newIndexSearchTool.title', {
      defaultMessage: 'New index search tool',
    }),
    editIndexSearchToolTitle: i18n.translate('xpack.agentBuilder.tools.editIndexSearchTool.title', {
      defaultMessage: 'Edit index search tool',
    }),

    editToolContextMenuButtonLabel: i18n.translate(
      'xpack.agentBuilder.tools.editToolContextMenuButtonLabel',
      {
        defaultMessage: 'Edit tool context menu',
      }
    ),
    saveButtonLabel: i18n.translate('xpack.agentBuilder.tools.saveButtonLabel', {
      defaultMessage: 'Save',
    }),
    testButtonLabel: i18n.translate('xpack.agentBuilder.tools.testButtonLabel', {
      defaultMessage: 'Test',
    }),
    saveAndTestButtonLabel: i18n.translate('xpack.agentBuilder.tools.saveAndTestButtonLabel', {
      defaultMessage: 'Save & test',
    }),
    cancelButtonLabel: i18n.translate('xpack.agentBuilder.tools.cancelButtonLabel', {
      defaultMessage: 'Cancel',
    }),
    saveButtonTooltip: i18n.translate('xpack.agentBuilder.tools.saveButtonTooltip', {
      defaultMessage: 'Resolve all form errors to save.',
    }),

    // Table columns and labels
    toolIdLabel: i18n.translate('xpack.agentBuilder.tools.idLabel', { defaultMessage: 'ID' }),
    tagsLabel: i18n.translate('xpack.agentBuilder.tools.tagsLabel', { defaultMessage: 'Labels' }),
    toolsLabel: i18n.translate('xpack.agentBuilder.tools.toolsLabel', { defaultMessage: 'Tools' }),

    // Tool types
    esqlLabel: i18n.translate('xpack.agentBuilder.tools.esqlLabel', { defaultMessage: 'ES|QL' }),
    builtinLabel: i18n.translate('xpack.agentBuilder.tools.builtinLabel', {
      defaultMessage: 'System',
    }),
    mcpLabel: i18n.translate('xpack.agentBuilder.tools.mcpLabel', { defaultMessage: 'MCP' }),
    searchLabel: i18n.translate('xpack.agentBuilder.tools.searchLabel', {
      defaultMessage: 'Search',
    }),
    indexTypeLabel: i18n.translate('xpack.agentBuilder.tools.indexTypeLabel', {
      defaultMessage: 'Index',
    }),
    aliasTypeLabel: i18n.translate('xpack.agentBuilder.tools.aliasTypeLabel', {
      defaultMessage: 'Alias',
    }),
    dataStreamTypeLabel: i18n.translate('xpack.agentBuilder.tools.dataStreamTypeLabel', {
      defaultMessage: 'Data stream',
    }),

    // MCP tool health status
    mcpHealthStatus: {
      toolNotFound: {
        title: i18n.translate('xpack.agentBuilder.tools.mcpHealthStatus.toolNotFound.title', {
          defaultMessage: 'Tool not found on MCP server',
        }),
        description: i18n.translate(
          'xpack.agentBuilder.tools.mcpHealthStatus.toolNotFound.description',
          {
            defaultMessage: 'It may have been removed or renamed.',
          }
        ),
      },
      connectorNotFound: {
        title: i18n.translate('xpack.agentBuilder.tools.mcpHealthStatus.connectorNotFound.title', {
          defaultMessage: 'MCP connector unavailable',
        }),
        description: i18n.translate(
          'xpack.agentBuilder.tools.mcpHealthStatus.connectorNotFound.description',
          {
            defaultMessage: 'Check your MCP server connection',
          }
        ),
      },
      listToolsFailed: {
        title: i18n.translate('xpack.agentBuilder.tools.mcpHealthStatus.listToolsFailed.title', {
          defaultMessage: "Can't retrieve tools from MCP server",
        }),
        description: i18n.translate(
          'xpack.agentBuilder.tools.mcpHealthStatus.listToolsFailed.description',
          {
            defaultMessage: 'Check your MCP server connection',
          }
        ),
      },
      toolUnhealthy: {
        title: i18n.translate('xpack.agentBuilder.tools.mcpHealthStatus.toolUnhealthy.title', {
          defaultMessage: 'Tool execution failed',
        }),
        description: i18n.translate(
          'xpack.agentBuilder.tools.mcpHealthStatus.toolUnhealthy.description',
          {
            defaultMessage: 'Check your MCP server connection',
          }
        ),
      },
    },

    // Actions
    editToolButtonLabel: i18n.translate('xpack.agentBuilder.tools.editToolButtonLabel', {
      defaultMessage: 'Edit',
    }),
    viewToolButtonLabel: i18n.translate('xpack.agentBuilder.tools.viewToolButtonLabel', {
      defaultMessage: 'View',
    }),
    deleteToolButtonLabel: i18n.translate('xpack.agentBuilder.tools.deleteToolButtonLabel', {
      defaultMessage: 'Delete',
    }),
    testToolButtonLabel: i18n.translate('xpack.agentBuilder.tools.testToolButtonLabel', {
      defaultMessage: 'Test',
    }),
    cloneToolButtonLabel: i18n.translate('xpack.agentBuilder.tools.cloneToolButtonLabel', {
      defaultMessage: 'Clone',
    }),
    toolContextMenuButtonLabel: i18n.translate(
      'xpack.agentBuilder.tools.toolContextMenuButtonLabel',
      {
        defaultMessage: 'Tool context menu',
      }
    ),

    // Table header and bulk actions
    deleteSelectedToolsButtonLabel: (count: number) =>
      i18n.translate('xpack.agentBuilder.tools.deleteSelectedToolsButtonLabel', {
        defaultMessage: 'Delete {count, plural, one {# Tool} other {# Tools}}',
        values: { count },
      }),
    selectAllToolsButtonLabel: i18n.translate(
      'xpack.agentBuilder.tools.selectAllToolsButtonLabel',
      {
        defaultMessage: 'Select all',
      }
    ),
    clearSelectionButtonLabel: i18n.translate(
      'xpack.agentBuilder.tools.clearSelectionButtonLabel',
      {
        defaultMessage: 'Clear selection',
      }
    ),
    includeSystemToolsSwitchLabel: i18n.translate(
      'xpack.agentBuilder.tools.includeSystemToolsSwitchLabel',
      {
        defaultMessage: 'Include system tools',
      }
    ),

    // Search and filters
    searchToolsPlaceholder: i18n.translate('xpack.agentBuilder.tools.searchToolsPlaceholder', {
      defaultMessage: 'Search',
    }),
    typeFilter: i18n.translate('xpack.agentBuilder.tools.typeFilter', { defaultMessage: 'Type' }),
    tagsFilter: i18n.translate('xpack.agentBuilder.tools.tagsFilter', { defaultMessage: 'Labels' }),

    // Empty states and messages
    noEsqlToolsMatchMessage: i18n.translate('xpack.agentBuilder.tools.noEsqlToolsMatchMessage', {
      defaultMessage: 'No tools match your search.',
    }),
    noEsqlToolsMessage: i18n.translate('xpack.agentBuilder.tools.noEsqlToolsMessage', {
      defaultMessage: "It looks like you don't have any ES|QL tools defined yet.",
    }),
    listToolsErrorMessage: i18n.translate('xpack.agentBuilder.tools.listToolsErrorMessage', {
      defaultMessage: 'Failed to fetch tools',
    }),

    // Success toasts
    deleteToolSuccessToast: (toolId: string) =>
      i18n.translate('xpack.agentBuilder.tools.deleteToolSuccessToast', {
        defaultMessage: 'Tool "{toolId}" deleted',
        values: { toolId },
      }),
    bulkDeleteToolsSuccessToast: (count: number) =>
      i18n.translate('xpack.agentBuilder.tools.bulkDeleteToolsSuccessToast', {
        defaultMessage: 'Deleted {count, plural, one {# tool} other {# tools}}',
        values: { count },
      }),
    createEsqlToolSuccessToast: (toolId: string) =>
      i18n.translate('xpack.agentBuilder.tools.createEsqlToolSuccessToast', {
        defaultMessage: 'Tool "{toolId}" created',
        values: { toolId },
      }),
    editEsqlToolSuccessToast: (toolId: string) =>
      i18n.translate('xpack.agentBuilder.tools.editEsqlToolSuccessToast', {
        defaultMessage: 'Tool "{toolId}" updated',
        values: { toolId },
      }),
    createIndexSearchToolSuccessToast: (toolId: string) =>
      i18n.translate('xpack.agentBuilder.tools.createIndexSearchToolSuccessToast', {
        defaultMessage: 'Tool "{toolId}" created',
        values: { toolId },
      }),
    editIndexSearchToolSuccessToast: (toolId: string) =>
      i18n.translate('xpack.agentBuilder.tools.editIndexSearchToolSuccessToast', {
        defaultMessage: 'Tool "{toolId}" updated',
        values: { toolId },
      }),

    // Error toasts
    deleteToolErrorToast: (toolId: string) =>
      i18n.translate('xpack.agentBuilder.tools.deleteToolErrorToast', {
        defaultMessage: 'Unable to delete tool "{toolId}"',
        values: { toolId },
      }),
    bulkDeleteToolsErrorToast: (count: number) =>
      i18n.translate('xpack.agentBuilder.tools.bulkDeleteToolsErrorToast', {
        defaultMessage: 'Unable to delete {count, plural, one {# tool} other {# tools}}',
        values: { count },
      }),
    createEsqlToolErrorToast: i18n.translate('xpack.agentBuilder.tools.createEsqlToolErrorToast', {
      defaultMessage: 'Unable to create tool',
    }),
    editEsqlToolErrorToast: (toolId: string) =>
      i18n.translate('xpack.agentBuilder.tools.editEsqlToolErrorToast', {
        defaultMessage: 'Unable to update tool "{toolId}"',
        values: { toolId },
      }),
    searchToolsErrorToast: i18n.translate('xpack.agentBuilder.tools.searchToolsErrorToast', {
      defaultMessage: 'Error searching tools',
    }),
    loadToolErrorToast: (toolId: string) =>
      i18n.translate('xpack.agentBuilder.tools.loadToolErrorToast', {
        defaultMessage: 'Unable to load "{toolId}"',
        values: { toolId },
      }),
    loadToolsErrorToast: i18n.translate('xpack.agentBuilder.tools.loadToolsErrorToast', {
      defaultMessage: 'Unable to load tools',
    }),

    // Delete modals
    deleteEsqlToolTitle: (toolId: string) =>
      i18n.translate('xpack.agentBuilder.tools.deleteEsqlToolTitle', {
        defaultMessage: 'Delete {toolId}?',
        values: { toolId },
      }),
    deleteEsqlToolCancelButton: i18n.translate(
      'xpack.agentBuilder.tools.deleteEsqlToolCancelButton',
      {
        defaultMessage: 'Cancel',
      }
    ),
    deleteEsqlToolConfirmButton: i18n.translate(
      'xpack.agentBuilder.tools.deleteEsqlToolConfirmButton',
      {
        defaultMessage: 'Delete tool',
      }
    ),
    deleteEsqlToolConfirmationText: i18n.translate(
      'xpack.agentBuilder.tools.deleteEsqlToolConfirmationText',
      {
        defaultMessage: 'This action will permanently remove the tool. This cannot be undone.',
      }
    ),

    // Bulk delete modal
    bulkDeleteEsqlToolsTitle: (count: number) =>
      i18n.translate('xpack.agentBuilder.tools.bulkDeleteEsqlToolsTitle', {
        defaultMessage: 'Delete {count, plural, one {# tool} other {# tools}}?',
        values: { count },
      }),
    bulkDeleteEsqlToolsConfirmationText: i18n.translate(
      'xpack.agentBuilder.tools.bulkDeleteEsqlToolsConfirmationText',
      {
        defaultMessage: "You can't recover deleted data.",
      }
    ),
    // Bulk import MCP tools
    bulkImportMcp: {
      title: i18n.translate('xpack.agentBuilder.tools.bulkImportMcp.title', {
        defaultMessage: 'Bulk import MCP tools',
      }),
      description: i18n.translate('xpack.agentBuilder.tools.bulkImportMcp.description', {
        defaultMessage:
          'Select an MCP server and import multiple tools at once to make them available in Agent Builder.',
      }),
      importToolsButton: i18n.translate(
        'xpack.agentBuilder.tools.bulkImportMcp.importToolsButton',
        {
          defaultMessage: 'Import tools',
        }
      ),
      cancelButton: i18n.translate('xpack.agentBuilder.tools.bulkImportMcp.cancelButton', {
        defaultMessage: 'Cancel',
      }),
      sourceSection: {
        title: i18n.translate('xpack.agentBuilder.tools.bulkImportMcp.sourceSection.title', {
          defaultMessage: 'Source',
        }),
        description: i18n.translate(
          'xpack.agentBuilder.tools.bulkImportMcp.sourceSection.description',
          {
            defaultMessage: 'Select the MCP server and preview the tools available for import.',
          }
        ),
        mcpServerLabel: i18n.translate(
          'xpack.agentBuilder.tools.bulkImportMcp.sourceSection.mcpServerLabel',
          {
            defaultMessage: 'MCP Server',
          }
        ),
        addMcpServerLink: i18n.translate(
          'xpack.agentBuilder.tools.bulkImportMcp.sourceSection.addMcpServerLink',
          {
            defaultMessage: 'Add a new MCP server',
          }
        ),
        toolsToImportLabel: i18n.translate(
          'xpack.agentBuilder.tools.bulkImportMcp.sourceSection.toolsToImportLabel',
          {
            defaultMessage: 'Tools to import',
          }
        ),
        nameColumn: i18n.translate(
          'xpack.agentBuilder.tools.bulkImportMcp.sourceSection.nameColumn',
          {
            defaultMessage: 'Name',
          }
        ),
        searchPlaceholder: i18n.translate(
          'xpack.agentBuilder.tools.bulkImportMcp.sourceSection.searchPlaceholder',
          {
            defaultMessage: 'Search tools',
          }
        ),
        selectedCount: (selected: number) =>
          i18n.translate('xpack.agentBuilder.tools.bulkImportMcp.sourceSection.selectedCount', {
            defaultMessage: '{selected} Selected',
            values: { selected },
          }),
        clearSelection: i18n.translate(
          'xpack.agentBuilder.tools.bulkImportMcp.sourceSection.clearSelection',
          {
            defaultMessage: 'Clear selection',
          }
        ),
        selectMcpServerMessage: i18n.translate(
          'xpack.agentBuilder.tools.bulkImportMcp.sourceSection.selectMcpServerMessage',
          {
            defaultMessage: 'Select an MCP server to see available tools.',
          }
        ),
        noToolsMessage: i18n.translate(
          'xpack.agentBuilder.tools.bulkImportMcp.sourceSection.noToolsMessage',
          {
            defaultMessage: 'No tools found on the selected MCP server.',
          }
        ),
        noMatchingToolsMessage: i18n.translate(
          'xpack.agentBuilder.tools.bulkImportMcp.sourceSection.noMatchingToolsMessage',
          {
            defaultMessage: 'No tools match your search.',
          }
        ),
        loadingToolsMessage: i18n.translate(
          'xpack.agentBuilder.tools.bulkImportMcp.sourceSection.loadingToolsMessage',
          {
            defaultMessage: 'Loading tools...',
          }
        ),
        toolsErrorMessage: i18n.translate(
          'xpack.agentBuilder.tools.bulkImportMcp.sourceSection.toolsErrorMessage',
          {
            defaultMessage: 'Failed to load tools from the selected MCP server.',
          }
        ),
        tableCaption: i18n.translate(
          'xpack.agentBuilder.tools.bulkImportMcp.sourceSection.tableCaption',
          {
            defaultMessage: 'MCP tools available for import',
          }
        ),
      },
      organizationSection: {
        title: i18n.translate('xpack.agentBuilder.tools.bulkImportMcp.organizationSection.title', {
          defaultMessage: 'Organization',
        }),
        description: i18n.translate(
          'xpack.agentBuilder.tools.bulkImportMcp.organizationSection.description',
          {
            defaultMessage: 'Choose how imported tools should be grouped and labeled.',
          }
        ),
        namespaceLabel: i18n.translate(
          'xpack.agentBuilder.tools.bulkImportMcp.organizationSection.namespaceLabel',
          {
            defaultMessage: 'Namespace',
          }
        ),
        namespaceHelpText: i18n.translate(
          'xpack.agentBuilder.tools.bulkImportMcp.organizationSection.namespaceHelpText',
          {
            defaultMessage: 'Minimum 1 character',
          }
        ),
        labelsLabel: i18n.translate(
          'xpack.agentBuilder.tools.bulkImportMcp.organizationSection.labelsLabel',
          {
            defaultMessage: 'Labels',
          }
        ),
      },
      importSuccessToast: (count: number) =>
        i18n.translate('xpack.agentBuilder.tools.bulkImportMcp.importSuccessToast', {
          defaultMessage: 'Successfully imported {count, plural, one {# tool} other {# tools}}',
          values: { count },
        }),
      importErrorToast: i18n.translate('xpack.agentBuilder.tools.bulkImportMcp.importErrorToast', {
        defaultMessage: 'Failed to import MCP tools',
      }),
      noToolsSelectedError: i18n.translate(
        'xpack.agentBuilder.tools.bulkImportMcp.noToolsSelectedError',
        {
          defaultMessage: 'Please select at least one tool to import.',
        }
      ),
    },
  },
  agents: {
    title: i18n.translate('xpack.agentBuilder.agents.list.title', { defaultMessage: 'Agents' }),
    newAgent: i18n.translate('xpack.agentBuilder.agents.new.title', {
      defaultMessage: 'New Agent',
    }),
    editAgent: i18n.translate('xpack.agentBuilder.agents.edit.title', {
      defaultMessage: 'Edit Agent',
    }),
    createAgent: i18n.translate('xpack.agentBuilder.agents.create.title', {
      defaultMessage: 'Create Agent',
    }),
    settings: {
      cancelButtonLabel: i18n.translate(
        'xpack.agentBuilder.agents.form.settings.cancelButtonLabel',
        {
          defaultMessage: 'Cancel',
        }
      ),
    },
  },
  navigationAbort: {
    title: i18n.translate('xpack.agentBuilder.navigationAbort.title', {
      defaultMessage: 'Abort chat request?',
    }),
    message: i18n.translate('xpack.agentBuilder.navigationAbort.message', {
      defaultMessage: 'A chat request is in progress. Do you want to navigate away and abort it?',
    }),
    confirmButton: i18n.translate('xpack.agentBuilder.navigationAbort.confirmButton', {
      defaultMessage: 'Yes, abort',
    }),
  },
};
