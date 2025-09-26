/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const i18nMessages = {
  paramUnusedWarning: (name: string) =>
    i18n.translate('xpack.onechat.tools.newTool.paramUnusedWarning', {
      defaultMessage: 'Parameter "{name}" is not used in the ES|QL query.',
      values: { name },
    }),
  paramNameLabel: i18n.translate('xpack.onechat.tools.newTool.paramNameLabel', {
    defaultMessage: 'Name',
  }),
  paramNamePlaceholder: i18n.translate('xpack.onechat.tools.newTool.paramNamePlaceholder', {
    defaultMessage: 'Name',
  }),
  paramDescriptionLabel: i18n.translate('xpack.onechat.tools.newTool.paramDescriptionLabel', {
    defaultMessage: 'Description',
  }),
  paramDescriptionPlaceholder: i18n.translate(
    'xpack.onechat.tools.newTool.paramDescriptionPlaceholder',
    {
      defaultMessage: 'Description',
    }
  ),
  paramTypeLabel: i18n.translate('xpack.onechat.tools.newTool.paramTypeLabel', {
    defaultMessage: 'Type',
  }),
  optionalParamLabel: i18n.translate('xpack.onechat.tools.newTool.optionalParamLabel', {
    defaultMessage: 'Optional',
  }),
  removeParamButtonLabel: i18n.translate('xpack.onechat.tools.newTool.removeParamButtonLabel', {
    defaultMessage: 'Remove parameter',
  }),
  addParamButtonLabel: i18n.translate('xpack.onechat.tools.newTool.addParamButtonLabel', {
    defaultMessage: 'Add a parameter',
  }),
  inferParamsButtonLabel: i18n.translate('xpack.onechat.tools.newTool.inferParamsButtonLabel', {
    defaultMessage: 'Infer parameters',
  }),
  noParamsMessage: i18n.translate('xpack.onechat.tools.newTool.noParamsMessage', {
    defaultMessage: 'Add parameters or infer them from your ES|QL query.',
  }),
  optionalFieldLabel: i18n.translate('xpack.onechat.tools.newTool.optionalFieldLabel', {
    defaultMessage: 'Optional',
  }),
  documentationLinkLabel: i18n.translate('xpack.onechat.tools.newTool.documentationLinkLabel', {
    defaultMessage: 'Documentation',
  }),
  systemReferences: {
    documentation: {
      title: i18n.translate('xpack.onechat.tools.newTool.systemReferences.title', {
        defaultMessage: 'System references',
      }),
      description: i18n.translate('xpack.onechat.tools.newTool.systemReferences.description', {
        defaultMessage:
          'These values are used by agents and configurations, not shown to end users.',
      }),
      fieldsHelp: {
        title: i18n.translate('xpack.onechat.tools.newTool.systemReferences.fieldsHelp.title', {
          defaultMessage: 'What are these fields?',
        }),
        toolId: {
          label: i18n.translate(
            'xpack.onechat.tools.newTool.systemReferences.fieldsHelp.toolId.label',
            {
              defaultMessage: 'Tool ID',
            }
          ),
          description: i18n.translate(
            'xpack.onechat.tools.newTool.systemReferences.fieldsHelp.toolId.description',
            {
              defaultMessage: 'Unique ID for referencing the tool in code or configurations.',
            }
          ),
        },
        description: {
          label: i18n.translate(
            'xpack.onechat.tools.newTool.systemReferences.fieldsHelp.description.label',
            {
              defaultMessage: 'Description',
            }
          ),
          description: i18n.translate(
            'xpack.onechat.tools.newTool.systemReferences.fieldsHelp.description.description',
            {
              defaultMessage:
                'Help humans and agents understand how the tool works. Start with a short human-friendly summary, because the first ~50 characters appear in the tool list.',
            }
          ),
        },
      },
      toolBasicsDocumentationLink: i18n.translate(
        'xpack.onechat.tools.newTool.toolBasics.documentationLink',
        {
          defaultMessage: 'Tool basics',
        }
      ),
    },
    form: {
      toolId: {
        label: i18n.translate('xpack.onechat.tools.newTool.form.toolIdLabel', {
          defaultMessage: 'Tool ID',
        }),
        helpText: i18n.translate('xpack.onechat.tools.newTool.form.toolIdHelpText', {
          defaultMessage:
            'Tool ID must start and end with a letter or number, and can only contain lowercase letters, numbers, dots, and underscores.',
        }),
      },
      description: {
        label: i18n.translate('xpack.onechat.tools.newTool.form.descriptionLabel', {
          defaultMessage: 'Description',
        }),
      },
    },
  },
  toolLabels: {
    documentation: {
      title: i18n.translate('xpack.onechat.tools.newTool.labels.title', {
        defaultMessage: 'Labels',
      }),
      description: i18n.translate('xpack.onechat.tools.newTool.labels.description', {
        defaultMessage:
          "Labels help with filtering, search, and bulk selection — they don't affect how tools behave.",
      }),
      documentationLink: i18n.translate(
        'xpack.onechat.tools.newTool.labels.toolLabelsDocumentationLink',
        {
          defaultMessage: 'Tool labels',
        }
      ),
    },
    form: {
      label: i18n.translate('xpack.onechat.tools.newTool.labels.formLabel', {
        defaultMessage: 'Labels',
      }),
      placeholder: i18n.translate('xpack.onechat.tools.newTool.labels.formPlaceholder', {
        defaultMessage: 'Add or create labels',
      }),
    },
  },
  configuration: {
    documentation: {
      title: i18n.translate('xpack.onechat.tools.newTool.configuration.title', {
        defaultMessage: 'Configuration',
      }),
      description: i18n.translate('xpack.onechat.tools.newTool.configuration.description', {
        defaultMessage:
          'Set up how the tool works, by defining the index pattern or ES|QL query syntax and any required parameters.',
      }),
      documentationLink: i18n.translate(
        'xpack.onechat.tools.newTool.configuration.documentationLink',
        {
          defaultMessage: 'Configuring a tool',
        }
      ),
    },
    form: {
      type: {
        label: i18n.translate('xpack.onechat.tools.newTool.configuration.form.type.label', {
          defaultMessage: 'Type',
        }),
        esqlOption: i18n.translate(
          'xpack.onechat.tools.newTool.configuration.form.type.esqlOption',
          {
            defaultMessage: 'ES|QL',
          }
        ),
        indexSearchOption: i18n.translate(
          'xpack.onechat.tools.newTool.configuration.form.type.indexSearchOption',
          {
            defaultMessage: 'Index search',
          }
        ),
        workflowOption: i18n.translate(
          'xpack.onechat.tools.newTool.configuration.form.type.workflowOption',
          {
            defaultMessage: 'Workflow',
          }
        ),
      },
      indexSearch: {
        patternLabel: i18n.translate(
          'xpack.onechat.tools.newTool.configuration.form.indexSearch.patternLabel',
          {
            defaultMessage: 'Target pattern',
          }
        ),
      },
      esql: {
        queryLabel: i18n.translate(
          'xpack.onechat.tools.newTool.configuration.form.esql.queryLabel',
          {
            defaultMessage: 'ES|QL Query',
          }
        ),
        parametersLabel: i18n.translate(
          'xpack.onechat.tools.newTool.configuration.form.esql.parametersLabel',
          {
            defaultMessage: 'ES|QL Parameters',
          }
        ),
      },
      workflow: {
        workflowLabel: i18n.translate(
          'xpack.onechat.tools.newTool.configuration.form.workflow.workflowLabel',
          {
            defaultMessage: 'Workflow',
          }
        ),
      },
    },
  },
};
