/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export * from '../../common/translations';

export const TEMPLATE_TITLE = i18n.translate('xpack.cases.templates.title', {
  defaultMessage: 'Templates',
});

export const TEMPLATE_DESCRIPTION = i18n.translate('xpack.cases.templates.description', {
  defaultMessage: 'Create templates that automatically populate values in new cases.',
});

export const NO_TEMPLATES = i18n.translate('xpack.cases.templates.noTemplates', {
  defaultMessage: 'You do not have any templates yet',
});

export const ADD_TEMPLATE = i18n.translate('xpack.cases.templates.addTemplate', {
  defaultMessage: 'Add template',
});

export const IMPORT_TEMPLATE = i18n.translate('xpack.cases.templates.importTemplate', {
  defaultMessage: 'Import template',
});

export const CREATE_TEMPLATE = i18n.translate('xpack.cases.templates.createTemplate', {
  defaultMessage: 'Create template',
});

export const REQUIRED = i18n.translate('xpack.cases.templates.required', {
  defaultMessage: 'Required',
});

export const REQUIRED_FIELD = (fieldName: string): string =>
  i18n.translate('xpack.cases.templates.requiredField', {
    values: { fieldName },
    defaultMessage: '{fieldName} is required.',
  });

export const TEMPLATE_NAME = i18n.translate('xpack.cases.templates.templateName', {
  defaultMessage: 'Template name',
});

export const TEMPLATE_TAGS_HELP = i18n.translate('xpack.cases.templates.templateTagsHelp', {
  defaultMessage: 'Separate tags with a line break.',
});

export const TEMPLATE_FIELDS = i18n.translate('xpack.cases.templates.templateFields', {
  defaultMessage: 'Template fields',
});

export const CASE_FIELDS = i18n.translate('xpack.cases.templates.caseFields', {
  defaultMessage: 'Case fields',
});

export const CASE_SETTINGS = i18n.translate('xpack.cases.templates.caseSettings', {
  defaultMessage: 'Case settings',
});

export const CONNECTOR_FIELDS = i18n.translate('xpack.cases.templates.connectorFields', {
  defaultMessage: 'External Connector Fields',
});

export const DELETE_TITLE = (name: string) =>
  i18n.translate('xpack.cases.configuration.deleteTitle', {
    values: { name },
    defaultMessage: 'Delete {name}?',
  });

export const DELETE_MESSAGE = (name: string) =>
  i18n.translate('xpack.cases.configuration.deleteMessage', {
    values: { name },
    defaultMessage: 'This action will permanently delete {name}.',
  });

export const MAX_TEMPLATE_LIMIT = (maxTemplates: number) =>
  i18n.translate('xpack.cases.templates.maxTemplateLimit', {
    values: { maxTemplates },
    defaultMessage: 'Maximum number of {maxTemplates} templates reached.',
  });

export const ERROR_FETCHING_TEMPLATES = i18n.translate(
  'xpack.cases.templates.errorFetchingTemplates',
  {
    defaultMessage: 'Error fetching templates',
  }
);

// Table column names
export const COLUMN_NAME = i18n.translate('xpack.cases.templates.column.name', {
  defaultMessage: 'Name',
});

export const COLUMN_DESCRIPTION = i18n.translate('xpack.cases.templates.column.description', {
  defaultMessage: 'Description',
});

export const COLUMN_SOLUTION = i18n.translate('xpack.cases.templates.column.solution', {
  defaultMessage: 'Solution',
});

export const COLUMN_FIELDS = i18n.translate('xpack.cases.templates.column.fields', {
  defaultMessage: 'Fields',
});

export const COLUMN_TAGS = i18n.translate('xpack.cases.templates.column.tags', {
  defaultMessage: 'Tags',
});

export const COLUMN_LAST_UPDATE = i18n.translate('xpack.cases.templates.column.lastUpdate', {
  defaultMessage: 'Last update',
});

export const COLUMN_LAST_TIME_USED = i18n.translate('xpack.cases.templates.column.lastTimeUsed', {
  defaultMessage: 'Last time used',
});

export const COLUMN_USAGE = i18n.translate('xpack.cases.templates.column.usage', {
  defaultMessage: 'Usage',
});

// Actions
export const ACTIONS = i18n.translate('xpack.cases.templates.actions', {
  defaultMessage: 'Actions',
});

export const EDIT_TEMPLATE = i18n.translate('xpack.cases.templates.editTemplate', {
  defaultMessage: 'Edit',
});

export const DELETE_TEMPLATE = i18n.translate('xpack.cases.templates.deleteTemplate', {
  defaultMessage: 'Delete',
});

export const SHOWING_TEMPLATES = (total: number) =>
  i18n.translate('xpack.cases.templates.showingTemplates', {
    values: { total },
    defaultMessage: 'of {total}',
  });

export const SHOWING = i18n.translate('xpack.cases.templates.showing', {
  defaultMessage: 'Showing',
});

export const CASE = i18n.translate('xpack.cases.templates.case', {
  defaultMessage: 'Case',
});

export const CASES = i18n.translate('xpack.cases.templates.cases', {
  defaultMessage: 'Cases',
});

export const DEFAULT = i18n.translate('xpack.cases.templates.default', {
  defaultMessage: 'Default',
});
