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
    staleCheckPartialFailureTitle: i18n.translate(
      'xpack.agentBuilder.conversations.staleCheckPartialFailureTitle',
      {
        defaultMessage: 'Could not check whether some attachments are outdated',
      }
    ),
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

    deleteToolUsedByAgentsTitle: (toolId: string) =>
      i18n.translate('xpack.agentBuilder.tools.deleteToolUsedByAgentsTitle', {
        defaultMessage: 'Tool "{toolId}" is used by agents',
        values: { toolId },
      }),
    deleteToolUsedByAgentsDescription: i18n.translate(
      'xpack.agentBuilder.tools.deleteToolUsedByAgentsDescription',
      {
        defaultMessage: 'Remove this tool from all agents that use it and delete the tool?',
      }
    ),
    deleteToolUsedByAgentsAgentListLabel: i18n.translate(
      'xpack.agentBuilder.tools.deleteToolUsedByAgentsAgentListLabel',
      {
        defaultMessage: 'Agents using this tool',
      }
    ),
    deleteToolUsedByAgentsAgentList: (agentNames: string[]) => agentNames.join(', '),
    deleteToolUsedByAgentsConfirmButton: i18n.translate(
      'xpack.agentBuilder.tools.deleteToolUsedByAgentsConfirmButton',
      {
        defaultMessage: 'Yes, remove and delete',
      }
    ),
    deleteToolUsedByAgentsCancelButton: i18n.translate(
      'xpack.agentBuilder.tools.deleteToolUsedByAgentsCancelButton',
      {
        defaultMessage: 'Cancel',
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
  skills: {
    title: i18n.translate('xpack.agentBuilder.skills.title', { defaultMessage: 'Skills' }),
    newSkillButton: i18n.translate('xpack.agentBuilder.skills.newSkillButton', {
      defaultMessage: 'New skill',
    }),
    newSkillTitle: i18n.translate('xpack.agentBuilder.skills.newSkillTitle', {
      defaultMessage: 'Create a new skill',
    }),
    editSkillTitle: i18n.translate('xpack.agentBuilder.skills.editSkillTitle', {
      defaultMessage: 'Edit skill',
    }),
    readOnly: i18n.translate('xpack.agentBuilder.skills.readOnly', {
      defaultMessage: 'Read-only',
    }),
    builtinLabel: i18n.translate('xpack.agentBuilder.skills.builtinLabel', {
      defaultMessage: 'Built-in',
    }),
    customLabel: i18n.translate('xpack.agentBuilder.skills.customLabel', {
      defaultMessage: 'Custom',
    }),
    skillsTableCaption: (skillsCount: number) =>
      i18n.translate('xpack.agentBuilder.skills.skillsTableCaption', {
        defaultMessage: 'Available skills for AI agents: {skillsCount} skills',
        values: { skillsCount },
      }),
    skillIdLabel: i18n.translate('xpack.agentBuilder.skills.idLabel', { defaultMessage: 'ID' }),
    nameLabel: i18n.translate('xpack.agentBuilder.skills.nameLabel', { defaultMessage: 'Name' }),
    descriptionLabel: i18n.translate('xpack.agentBuilder.skills.descriptionLabel', {
      defaultMessage: 'Description',
    }),
    contentLabel: i18n.translate('xpack.agentBuilder.skills.contentLabel', {
      defaultMessage: 'Instructions',
    }),
    toolsLabel: i18n.translate('xpack.agentBuilder.skills.toolsLabel', { defaultMessage: 'Tools' }),
    referencedContentLabel: i18n.translate('xpack.agentBuilder.skills.referencedContentLabel', {
      defaultMessage: 'Additional files',
    }),
    typeLabel: i18n.translate('xpack.agentBuilder.skills.typeLabel', { defaultMessage: 'Type' }),
    saveButtonLabel: i18n.translate('xpack.agentBuilder.skills.saveButtonLabel', {
      defaultMessage: 'Save',
    }),
    cancelButtonLabel: i18n.translate('xpack.agentBuilder.skills.cancelButtonLabel', {
      defaultMessage: 'Cancel',
    }),
    saveButtonTooltip: i18n.translate('xpack.agentBuilder.skills.saveButtonTooltip', {
      defaultMessage: 'Resolve all form errors to save.',
    }),
    editSkillButtonLabel: i18n.translate('xpack.agentBuilder.skills.editSkillButtonLabel', {
      defaultMessage: 'Edit',
    }),
    viewSkillButtonLabel: i18n.translate('xpack.agentBuilder.skills.viewSkillButtonLabel', {
      defaultMessage: 'View',
    }),
    deleteSkillButtonLabel: i18n.translate('xpack.agentBuilder.skills.deleteSkillButtonLabel', {
      defaultMessage: 'Delete',
    }),
    skillContextMenuButtonLabel: i18n.translate(
      'xpack.agentBuilder.skills.skillContextMenuButtonLabel',
      {
        defaultMessage: 'Skill context menu',
      }
    ),
    searchSkillsPlaceholder: i18n.translate('xpack.agentBuilder.skills.searchSkillsPlaceholder', {
      defaultMessage: 'Search',
    }),
    noSkillsMatchMessage: i18n.translate('xpack.agentBuilder.skills.noSkillsMatchMessage', {
      defaultMessage: 'No skills match your search.',
    }),
    noSkillsMessage: i18n.translate('xpack.agentBuilder.skills.noSkillsMessage', {
      defaultMessage: "It looks like you don't have any custom skills defined yet.",
    }),
    listSkillsErrorMessage: i18n.translate('xpack.agentBuilder.skills.listSkillsErrorMessage', {
      defaultMessage: 'Failed to fetch skills',
    }),
    includeBuiltinSkillsSwitchLabel: i18n.translate(
      'xpack.agentBuilder.skills.includeBuiltinSkillsSwitchLabel',
      {
        defaultMessage: 'Include built-in skills',
      }
    ),
    deleteSkillSuccessToast: (skillId: string) =>
      i18n.translate('xpack.agentBuilder.skills.deleteSkillSuccessToast', {
        defaultMessage: 'Skill "{skillId}" deleted',
        values: { skillId },
      }),
    createSkillSuccessToast: (skillId: string) =>
      i18n.translate('xpack.agentBuilder.skills.createSkillSuccessToast', {
        defaultMessage: 'Skill "{skillId}" created',
        values: { skillId },
      }),
    editSkillSuccessToast: (skillId: string) =>
      i18n.translate('xpack.agentBuilder.skills.editSkillSuccessToast', {
        defaultMessage: 'Skill "{skillId}" updated',
        values: { skillId },
      }),
    deleteSkillErrorToast: (skillId: string) =>
      i18n.translate('xpack.agentBuilder.skills.deleteSkillErrorToast', {
        defaultMessage: 'Unable to delete skill "{skillId}"',
        values: { skillId },
      }),
    createSkillErrorToast: i18n.translate('xpack.agentBuilder.skills.createSkillErrorToast', {
      defaultMessage: 'Unable to create skill',
    }),
    editSkillErrorToast: (skillId: string) =>
      i18n.translate('xpack.agentBuilder.skills.editSkillErrorToast', {
        defaultMessage: 'Unable to update skill "{skillId}"',
        values: { skillId },
      }),
    loadSkillErrorToast: (skillId: string) =>
      i18n.translate('xpack.agentBuilder.skills.loadSkillErrorToast', {
        defaultMessage: 'Unable to load "{skillId}"',
        values: { skillId },
      }),
    loadSkillsErrorToast: i18n.translate('xpack.agentBuilder.skills.loadSkillsErrorToast', {
      defaultMessage: 'Unable to load skills',
    }),
    deleteSkillTitle: (skillId: string) =>
      i18n.translate('xpack.agentBuilder.skills.deleteSkillTitle', {
        defaultMessage: 'Delete {skillId}?',
        values: { skillId },
      }),
    deleteSkillCancelButton: i18n.translate('xpack.agentBuilder.skills.deleteSkillCancelButton', {
      defaultMessage: 'Cancel',
    }),
    deleteSkillConfirmButton: i18n.translate('xpack.agentBuilder.skills.deleteSkillConfirmButton', {
      defaultMessage: 'Delete skill',
    }),
    deleteSkillConfirmationText: i18n.translate(
      'xpack.agentBuilder.skills.deleteSkillConfirmationText',
      {
        defaultMessage: 'This action will permanently remove the skill. This cannot be undone.',
      }
    ),
    toolIdsLabel: i18n.translate('xpack.agentBuilder.skills.toolIdsLabel', {
      defaultMessage: 'Associated tools',
    }),
    toolIdsHelpText: i18n.translate('xpack.agentBuilder.skills.toolIdsHelpText', {
      defaultMessage: 'Select tools that this skill can use.',
    }),
    experimentalLabel: i18n.translate('xpack.agentBuilder.skills.experimentalLabel', {
      defaultMessage: 'Experimental',
    }),
  },
  plugins: {
    title: i18n.translate('xpack.agentBuilder.plugins.title', { defaultMessage: 'Plugins' }),
    pluginsTableCaption: (pluginsCount: number) =>
      i18n.translate('xpack.agentBuilder.plugins.pluginsTableCaption', {
        defaultMessage: 'Plugins: {pluginsCount} plugins',
        values: { pluginsCount },
      }),
    nameLabel: i18n.translate('xpack.agentBuilder.plugins.nameLabel', {
      defaultMessage: 'Name',
    }),
    descriptionLabel: i18n.translate('xpack.agentBuilder.plugins.descriptionLabel', {
      defaultMessage: 'Description',
    }),
    versionLabel: i18n.translate('xpack.agentBuilder.plugins.versionLabel', {
      defaultMessage: 'Version',
    }),
    skillsLabel: i18n.translate('xpack.agentBuilder.plugins.skillsLabel', {
      defaultMessage: 'Skills',
    }),
    sourceLabel: i18n.translate('xpack.agentBuilder.plugins.sourceLabel', {
      defaultMessage: 'Source',
    }),
    searchPluginsPlaceholder: i18n.translate(
      'xpack.agentBuilder.plugins.searchPluginsPlaceholder',
      {
        defaultMessage: 'Search plugins',
      }
    ),
    noPluginsMatchMessage: i18n.translate('xpack.agentBuilder.plugins.noPluginsMatchMessage', {
      defaultMessage: 'No plugins match your search',
    }),
    noPluginsMessage: i18n.translate('xpack.agentBuilder.plugins.noPluginsMessage', {
      defaultMessage: 'No plugins installed',
    }),
    listPluginsErrorMessage: i18n.translate('xpack.agentBuilder.plugins.listPluginsErrorMessage', {
      defaultMessage: 'Failed to fetch plugins',
    }),
    loadPluginsErrorToast: i18n.translate('xpack.agentBuilder.plugins.loadPluginsErrorToast', {
      defaultMessage: 'Unable to load plugins',
    }),
    deletePluginSuccessToast: (pluginName: string) =>
      i18n.translate('xpack.agentBuilder.plugins.deletePluginSuccessToast', {
        defaultMessage: 'Plugin "{pluginName}" deleted',
        values: { pluginName },
      }),
    deletePluginErrorToast: (pluginName: string) =>
      i18n.translate('xpack.agentBuilder.plugins.deletePluginErrorToast', {
        defaultMessage: 'Unable to delete plugin "{pluginName}"',
        values: { pluginName },
      }),
    deletePluginTitle: (pluginName: string) =>
      i18n.translate('xpack.agentBuilder.plugins.deletePluginTitle', {
        defaultMessage: 'Delete {pluginName}?',
        values: { pluginName },
      }),
    deletePluginCancelButton: i18n.translate(
      'xpack.agentBuilder.plugins.deletePluginCancelButton',
      {
        defaultMessage: 'Cancel',
      }
    ),
    deletePluginConfirmButton: i18n.translate(
      'xpack.agentBuilder.plugins.deletePluginConfirmButton',
      {
        defaultMessage: 'Delete plugin',
      }
    ),
    deletePluginConfirmationText: i18n.translate(
      'xpack.agentBuilder.plugins.deletePluginConfirmationText',
      {
        defaultMessage:
          'This will permanently remove the plugin and all its managed skills. This cannot be undone.',
      }
    ),
    pluginContextMenuButtonLabel: i18n.translate(
      'xpack.agentBuilder.plugins.pluginContextMenuButtonLabel',
      {
        defaultMessage: 'Plugin context menu',
      }
    ),
    deletePluginButtonLabel: i18n.translate('xpack.agentBuilder.plugins.deletePluginButtonLabel', {
      defaultMessage: 'Delete',
    }),
    installPluginButton: i18n.translate('xpack.agentBuilder.plugins.installPluginButton', {
      defaultMessage: 'Install plugin',
    }),
    installFromUrlMenuItem: i18n.translate('xpack.agentBuilder.plugins.installFromUrlMenuItem', {
      defaultMessage: 'Install from URL',
    }),
    uploadMenuItem: i18n.translate('xpack.agentBuilder.plugins.uploadMenuItem', {
      defaultMessage: 'Upload ZIP',
    }),
    installFromUrlModalTitle: i18n.translate(
      'xpack.agentBuilder.plugins.installFromUrlModalTitle',
      {
        defaultMessage: 'Install plugin from URL',
      }
    ),
    uploadPluginModalTitle: i18n.translate('xpack.agentBuilder.plugins.uploadPluginModalTitle', {
      defaultMessage: 'Upload plugin',
    }),
    urlFieldLabel: i18n.translate('xpack.agentBuilder.plugins.urlFieldLabel', {
      defaultMessage: 'Plugin URL',
    }),
    urlFieldPlaceholder: i18n.translate('xpack.agentBuilder.plugins.urlFieldPlaceholder', {
      defaultMessage: 'https://github.com/...',
    }),
    fileFieldLabel: i18n.translate('xpack.agentBuilder.plugins.fileFieldLabel', {
      defaultMessage: 'Plugin ZIP file',
    }),
    installButton: i18n.translate('xpack.agentBuilder.plugins.installButton', {
      defaultMessage: 'Install',
    }),
    cancelButton: i18n.translate('xpack.agentBuilder.plugins.cancelButton', {
      defaultMessage: 'Cancel',
    }),
    installPluginSuccessToast: (pluginName: string) =>
      i18n.translate('xpack.agentBuilder.plugins.installPluginSuccessToast', {
        defaultMessage: 'Plugin "{pluginName}" installed',
        values: { pluginName },
      }),
    installPluginErrorToast: i18n.translate('xpack.agentBuilder.plugins.installPluginErrorToast', {
      defaultMessage: 'Failed to install plugin',
    }),
    uploadPluginSuccessToast: (pluginName: string) =>
      i18n.translate('xpack.agentBuilder.plugins.uploadPluginSuccessToast', {
        defaultMessage: 'Plugin "{pluginName}" installed',
        values: { pluginName },
      }),
    uploadPluginErrorToast: i18n.translate('xpack.agentBuilder.plugins.uploadPluginErrorToast', {
      defaultMessage: 'Failed to upload plugin',
    }),
    readOnly: i18n.translate('xpack.agentBuilder.plugins.readOnly', {
      defaultMessage: 'Built-in plugin (read-only)',
    }),
    viewPluginButtonLabel: i18n.translate('xpack.agentBuilder.plugins.viewPluginButtonLabel', {
      defaultMessage: 'View',
    }),
    pluginDetailsTitle: i18n.translate('xpack.agentBuilder.plugins.pluginDetailsTitle', {
      defaultMessage: 'Plugin details',
    }),
    backToPluginsButton: i18n.translate('xpack.agentBuilder.plugins.backToPluginsButton', {
      defaultMessage: 'Back to plugins',
    }),
    idLabel: i18n.translate('xpack.agentBuilder.plugins.idLabel', {
      defaultMessage: 'ID',
    }),
    authorLabel: i18n.translate('xpack.agentBuilder.plugins.authorLabel', {
      defaultMessage: 'Author',
    }),
    noSkillsLabel: i18n.translate('xpack.agentBuilder.plugins.noSkillsLabel', {
      defaultMessage: 'None',
    }),
    identitySectionTitle: i18n.translate('xpack.agentBuilder.plugins.identitySectionTitle', {
      defaultMessage: 'Identity',
    }),
    identitySectionDescription: i18n.translate(
      'xpack.agentBuilder.plugins.identitySectionDescription',
      {
        defaultMessage: 'Core identifiers and version information for the plugin.',
      }
    ),
    aboutSectionTitle: i18n.translate('xpack.agentBuilder.plugins.aboutSectionTitle', {
      defaultMessage: 'About',
    }),
    aboutSectionDescription: i18n.translate('xpack.agentBuilder.plugins.aboutSectionDescription', {
      defaultMessage: 'Description and authorship information.',
    }),
    sourceSectionTitle: i18n.translate('xpack.agentBuilder.plugins.sourceSectionTitle', {
      defaultMessage: 'Source',
    }),
    sourceSectionDescription: i18n.translate(
      'xpack.agentBuilder.plugins.sourceSectionDescription',
      {
        defaultMessage: 'Where the plugin was installed from.',
      }
    ),
    skillsSectionTitle: i18n.translate('xpack.agentBuilder.plugins.skillsSectionTitle', {
      defaultMessage: 'Skills',
    }),
    skillsSectionDescription: i18n.translate(
      'xpack.agentBuilder.plugins.skillsSectionDescription',
      {
        defaultMessage: 'Skills provided by this plugin.',
      }
    ),
    loadPluginErrorToast: (pluginId: string) =>
      i18n.translate('xpack.agentBuilder.plugins.loadPluginErrorToast', {
        defaultMessage: 'Unable to load "{pluginId}"',
        values: { pluginId },
      }),
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
