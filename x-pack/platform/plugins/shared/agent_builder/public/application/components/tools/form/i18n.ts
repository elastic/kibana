/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const i18nMessages = {
  paramUnusedWarning: (name: string) =>
    i18n.translate('xpack.agentBuilder.tools.newTool.paramUnusedWarning', {
      defaultMessage: 'Parameter "{name}" is not used in the ES|QL query.',
      values: { name },
    }),
  paramNameLabel: i18n.translate('xpack.agentBuilder.tools.newTool.paramNameLabel', {
    defaultMessage: 'Name',
  }),
  paramNamePlaceholder: i18n.translate('xpack.agentBuilder.tools.newTool.paramNamePlaceholder', {
    defaultMessage: 'Name',
  }),
  paramDescriptionLabel: i18n.translate('xpack.agentBuilder.tools.newTool.paramDescriptionLabel', {
    defaultMessage: 'Description',
  }),
  paramDescriptionPlaceholder: i18n.translate(
    'xpack.agentBuilder.tools.newTool.paramDescriptionPlaceholder',
    {
      defaultMessage: 'Description',
    }
  ),
  paramTypeLabel: i18n.translate('xpack.agentBuilder.tools.newTool.paramTypeLabel', {
    defaultMessage: 'Type',
  }),
  optionalParamLabel: i18n.translate('xpack.agentBuilder.tools.newTool.optionalParamLabel', {
    defaultMessage: 'Optional',
  }),
  defaultValueLabel: i18n.translate('xpack.agentBuilder.tools.newTool.defaultValueLabel', {
    defaultMessage: 'Default value',
  }),
  defaultValuePlaceholder: i18n.translate(
    'xpack.agentBuilder.tools.newTool.defaultValuePlaceholder',

    {
      defaultMessage: 'Enter default value...',
    }
  ),
  removeParamButtonLabel: i18n.translate(
    'xpack.agentBuilder.tools.newTool.removeParamButtonLabel',
    {
      defaultMessage: 'Remove parameter',
    }
  ),
  addParamButtonLabel: i18n.translate('xpack.agentBuilder.tools.newTool.addParamButtonLabel', {
    defaultMessage: 'Add a parameter',
  }),
  inferParamsButtonLabel: i18n.translate(
    'xpack.agentBuilder.tools.newTool.inferParamsButtonLabel',
    {
      defaultMessage: 'Infer parameters',
    }
  ),
  noParamsMessage: i18n.translate('xpack.agentBuilder.tools.newTool.noParamsMessage', {
    defaultMessage: 'Add parameters or infer them from your ES|QL query.',
  }),
  optionalFieldLabel: i18n.translate('xpack.agentBuilder.tools.newTool.optionalFieldLabel', {
    defaultMessage: 'Optional',
  }),
  documentationLinkLabel: i18n.translate(
    'xpack.agentBuilder.tools.newTool.documentationLinkLabel',
    {
      defaultMessage: 'Documentation',
    }
  ),
  systemReferences: {
    documentation: {
      title: i18n.translate('xpack.agentBuilder.tools.newTool.systemReferences.title', {
        defaultMessage: 'Details',
      }),
      description: i18n.translate('xpack.agentBuilder.tools.newTool.systemReferences.description', {
        defaultMessage: "Define the tool's ID and describe how it behaves.",
      }),
      toolBasicsDocumentationLink: i18n.translate(
        'xpack.agentBuilder.tools.newTool.toolBasics.documentationLink',
        {
          defaultMessage: 'Tool basics',
        }
      ),
    },
    form: {
      toolId: {
        label: i18n.translate('xpack.agentBuilder.tools.newTool.form.toolIdLabel', {
          defaultMessage: 'Tool ID',
        }),
        helpText: i18n.translate('xpack.agentBuilder.tools.newTool.form.toolIdHelpText', {
          defaultMessage:
            'Tool ID must start and end with a letter or number, and can only contain lowercase letters, numbers, dots, and underscores.',
        }),
      },
      description: {
        label: i18n.translate('xpack.agentBuilder.tools.newTool.form.descriptionLabel', {
          defaultMessage: 'Description',
        }),
      },
    },
  },
  toolLabels: {
    documentation: {
      title: i18n.translate('xpack.agentBuilder.tools.newTool.labels.title', {
        defaultMessage: 'Labels',
      }),
      description: i18n.translate('xpack.agentBuilder.tools.newTool.labels.description', {
        defaultMessage: 'Add labels for filtering and organizing tools.',
      }),
      documentationLink: i18n.translate(
        'xpack.agentBuilder.tools.newTool.labels.toolLabelsDocumentationLink',
        {
          defaultMessage: 'Tool labels',
        }
      ),
    },
    form: {
      label: i18n.translate('xpack.agentBuilder.tools.newTool.labels.formLabel', {
        defaultMessage: 'Labels',
      }),
      placeholder: i18n.translate('xpack.agentBuilder.tools.newTool.labels.formPlaceholder', {
        defaultMessage: 'Add or create labels',
      }),
    },
  },
  configuration: {
    documentation: {
      title: i18n.translate('xpack.agentBuilder.tools.newTool.configuration.title', {
        defaultMessage: 'Type',
      }),
      description: i18n.translate('xpack.agentBuilder.tools.newTool.configuration.description', {
        defaultMessage: "Set the tool's type and the parameters that control how it operates.",
      }),
      documentationLink: i18n.translate(
        'xpack.agentBuilder.tools.newTool.configuration.documentationLink',
        {
          defaultMessage: 'Configuring a tool',
        }
      ),
    },
    form: {
      type: {
        label: i18n.translate('xpack.agentBuilder.tools.newTool.configuration.form.type.label', {
          defaultMessage: 'Type',
        }),
        esqlOption: i18n.translate(
          'xpack.agentBuilder.tools.newTool.configuration.form.type.esqlOption',
          {
            defaultMessage: 'ES|QL',
          }
        ),
        indexSearchOption: i18n.translate(
          'xpack.agentBuilder.tools.newTool.configuration.form.type.indexSearchOption',
          {
            defaultMessage: 'Index search',
          }
        ),
        workflowOption: i18n.translate(
          'xpack.agentBuilder.tools.newTool.configuration.form.type.workflowOption',
          {
            defaultMessage: 'Workflow',
          }
        ),
        mcpOption: i18n.translate(
          'xpack.agentBuilder.tools.newTool.configuration.form.type.mcpOption',
          {
            defaultMessage: 'MCP',
          }
        ),
      },
      indexSearch: {
        patternLabel: i18n.translate(
          'xpack.agentBuilder.tools.newTool.configuration.form.indexSearch.patternLabel',
          {
            defaultMessage: 'Target pattern',
          }
        ),
        defaultRowLimitLabel: i18n.translate(
          'xpack.agentBuilder.tools.newTool.configuration.form.indexSearch.defaultRowLimitLabel',
          {
            defaultMessage: 'Row limit',
          }
        ),
        defaultRowLimitHelpText: i18n.translate(
          'xpack.agentBuilder.tools.newTool.configuration.form.indexSearch.defaultRowLimitHelpText',
          {
            defaultMessage: 'Maximum number of rows to return from ES|QL queries.',
          }
        ),
        customInstructionsLabel: i18n.translate(
          'xpack.agentBuilder.tools.newTool.configuration.form.indexSearch.customInstructionsLabel',
          {
            defaultMessage: 'Custom instructions',
          }
        ),
        customInstructionsHelpText: i18n.translate(
          'xpack.agentBuilder.tools.newTool.configuration.form.indexSearch.customInstructionsHelpText',
          {
            defaultMessage:
              'Additional guidance for ES|QL query generation, such as field selection or limit logic.',
          }
        ),
        customInstructionsPlaceholder: i18n.translate(
          'xpack.agentBuilder.tools.newTool.configuration.form.indexSearch.customInstructionsPlaceholder',
          {
            defaultMessage: 'e.g., "Always include timestamp field" ',
          }
        ),
      },
      esql: {
        queryLabel: i18n.translate(
          'xpack.agentBuilder.tools.newTool.configuration.form.esql.queryLabel',
          {
            defaultMessage: 'ES|QL Query',
          }
        ),
        parametersLabel: i18n.translate(
          'xpack.agentBuilder.tools.newTool.configuration.form.esql.parametersLabel',
          {
            defaultMessage: 'ES|QL Parameters',
          }
        ),
      },
      workflow: {
        workflowLabel: i18n.translate(
          'xpack.agentBuilder.tools.newTool.configuration.form.workflow.workflowLabel',
          {
            defaultMessage: 'Workflow',
          }
        ),
        waitForCompletionLabel: i18n.translate(
          'xpack.agentBuilder.tools.newTool.configuration.form.workflow.waitForCompletionLabel',
          {
            defaultMessage: 'Workflow execution',
          }
        ),
        waitForCompletionHelpText: i18n.translate(
          'xpack.agentBuilder.tools.newTool.configuration.form.workflow.waitForCompletionHelpText',
          {
            defaultMessage:
              'If checked, the tool waits until the workflow completes (up to 120s) and returns the results. If unchecked, the workflow runs in the background and you can ask the agent to check the execution status.',
          }
        ),
        waitForCompletionCheckboxLabel: i18n.translate(
          'xpack.agentBuilder.tools.newTool.configuration.form.workflow.waitForCompletionCheckboxLabel',
          {
            defaultMessage: 'Wait until the workflow completes',
          }
        ),
      },
      mcp: {
        connectorLabel: i18n.translate(
          'xpack.agentBuilder.tools.newTool.configuration.form.mcp.connectorLabel',
          {
            defaultMessage: 'MCP Server',
          }
        ),
        mcpToolLabel: i18n.translate(
          'xpack.agentBuilder.tools.newTool.configuration.form.mcp.mcpToolLabel',
          {
            defaultMessage: 'Tool',
          }
        ),
        mcpToolFetchError: i18n.translate(
          'xpack.agentBuilder.tools.newTool.configuration.form.mcp.mcpToolFetchError',
          {
            defaultMessage:
              "We're unable to fetch tools from this MCP server. This is usually caused by a connection or configuration issue with the MCP connector.",
          }
        ),
        mcpToolDetailsTitle: i18n.translate(
          'xpack.agentBuilder.tools.newTool.configuration.form.mcp.mcpToolDetailsTitle',
          {
            defaultMessage: 'MCP Tool Details',
          }
        ),
        addMcpServerButtonLabel: i18n.translate(
          'xpack.agentBuilder.tools.newTool.configuration.form.mcp.addMcpServerButtonLabel',
          {
            defaultMessage: 'Add a new MCP Server',
          }
        ),
        bulkImportMcpToolsButtonLabel: i18n.translate(
          'xpack.agentBuilder.tools.newTool.configuration.form.mcp.bulkImportMcpToolsButtonLabel',
          {
            defaultMessage: 'Bulk import MCP Tools',
          }
        ),
        mcpHealthStatusHealthy: i18n.translate(
          'xpack.agentBuilder.tools.newTool.configuration.form.mcp.mcpHealthStatusHealthy',
          {
            defaultMessage: 'Healthy',
          }
        ),
        mcpHealthStatusError: i18n.translate(
          'xpack.agentBuilder.tools.newTool.configuration.form.mcp.mcpHealthStatusError',
          {
            defaultMessage: 'Error',
          }
        ),
        mcpHealthStatusLoading: i18n.translate(
          'xpack.agentBuilder.tools.newTool.configuration.form.mcp.mcpHealthStatusLoading',
          {
            defaultMessage: 'Loading',
          }
        ),
      },
    },
  },
};
