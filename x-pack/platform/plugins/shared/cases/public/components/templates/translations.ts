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

export const NO_TEMPLATES_BODY = i18n.translate('xpack.cases.templates.noTemplatesBody', {
  defaultMessage: 'Create templates that automatically populate values in new cases.',
});

export const NO_TEMPLATES_MATCH_FILTERS = i18n.translate(
  'xpack.cases.templates.noTemplatesMatchFilters',
  {
    defaultMessage: 'No templates match your search criteria',
  }
);

export const NO_TEMPLATES_MATCH_FILTERS_BODY = i18n.translate(
  'xpack.cases.templates.noTemplatesMatchFiltersBody',
  {
    defaultMessage: 'Try modifying your search or filters.',
  }
);

export const SEARCH_TEMPLATES = i18n.translate('xpack.cases.templates.searchTemplates', {
  defaultMessage: 'Search templates',
});

export const SEARCH_TEMPLATES_PLACEHOLDER = i18n.translate(
  'xpack.cases.templates.searchPlaceholder',
  {
    defaultMessage: 'Search by name, description, or field name',
  }
);

export const REFRESH_TEMPLATES = i18n.translate('xpack.cases.templates.refreshTemplates', {
  defaultMessage: 'Refresh templates',
});

export const TAGS = i18n.translate('xpack.cases.templates.tags', {
  defaultMessage: 'Tags',
});

export const CREATED_BY = i18n.translate('xpack.cases.templates.createdBy', {
  defaultMessage: 'Created by',
});

export const TEMPLATES_INFO_TITLE = i18n.translate('xpack.cases.templates.infoTitle', {
  defaultMessage: 'Create custom templates for your needs',
});

export const TEMPLATES_INFO_DESCRIPTION = i18n.translate('xpack.cases.templates.infoDescription', {
  defaultMessage:
    'Create templates with custom set of fields, that can automatically populate values in new cases.',
});

export const LEARN_MORE = i18n.translate('xpack.cases.templates.learnMore', {
  defaultMessage: 'Learn more',
});

export const ADD_TEMPLATE = i18n.translate('xpack.cases.templates.addTemplate', {
  defaultMessage: 'Add template',
});

export const IMPORT_TEMPLATE = i18n.translate('xpack.cases.templates.importTemplate', {
  defaultMessage: 'Import template',
});

export const IMPORT_TEMPLATE_DESCRIPTION = i18n.translate(
  'xpack.cases.templates.importTemplateDescription',
  {
    defaultMessage: 'Requires YAML format upload',
  }
);

export const IMPORT_SELECTED = i18n.translate('xpack.cases.templates.importSelected', {
  defaultMessage: 'Import selected',
});

export const CANCEL = i18n.translate('xpack.cases.templates.cancel', {
  defaultMessage: 'Cancel',
});

export const CREATE_TEMPLATE = i18n.translate('xpack.cases.templates.createTemplate', {
  defaultMessage: 'Create template',
});

export const CREATE_NEW_TEMPLATE_DESCRIPTION = i18n.translate(
  'xpack.cases.templates.createNewTemplateDescription',
  {
    defaultMessage: 'Create a new template',
  }
);

export const EDITING_TEMPLATE = (templateId: string) =>
  i18n.translate('xpack.cases.templates.editingTemplate', {
    values: { templateId },
    defaultMessage: 'Editing template: {templateId}',
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

export const ERROR_FETCHING_TEMPLATE_TAGS = i18n.translate(
  'xpack.cases.templates.errorFetchingTemplateTags',
  {
    defaultMessage: 'Error fetching template tags',
  }
);

export const ERROR_FETCHING_TEMPLATE_CREATORS = i18n.translate(
  'xpack.cases.templates.errorFetchingTemplateCreators',
  {
    defaultMessage: 'Error fetching template creators',
  }
);

export const ERROR_CREATING_TEMPLATE = i18n.translate(
  'xpack.cases.templates.errorCreatingTemplate',
  {
    defaultMessage: 'Error creating template',
  }
);

export const SUCCESS_CREATING_TEMPLATE = i18n.translate(
  'xpack.cases.templates.successCreatingTemplate',
  {
    defaultMessage: 'Template created successfully',
  }
);

export const ERROR_UPDATING_TEMPLATE = i18n.translate(
  'xpack.cases.templates.errorUpdatingTemplate',
  {
    defaultMessage: 'Error updating template',
  }
);

export const SUCCESS_UPDATING_TEMPLATE = i18n.translate(
  'xpack.cases.templates.successUpdatingTemplate',
  {
    defaultMessage: 'Template updated successfully',
  }
);

export const SUCCESS_SET_AS_DEFAULT_TEMPLATE = (templateName: string) =>
  i18n.translate('xpack.cases.templates.successSetAsDefaultTemplate', {
    defaultMessage: 'Template {templateName} was set as default',
    values: { templateName },
  });

export const SUCCESS_CLONING_TEMPLATE = (templateName: string) =>
  i18n.translate('xpack.cases.templates.successCloningTemplate', {
    defaultMessage: '{templateName} was cloned successfully',
    values: { templateName },
  });

export const CLONED_TEMPLATE_NAME_PREFIX = (templateName: string) =>
  i18n.translate('xpack.cases.templates.clonedTemplateNamePrefix', {
    defaultMessage: 'Cloned: {templateName}',
    values: { templateName },
  });

export const ERROR_DELETING_TEMPLATE = i18n.translate(
  'xpack.cases.templates.errorDeletingTemplate',
  {
    defaultMessage: 'Error deleting template',
  }
);

export const SUCCESS_DELETING_TEMPLATE = i18n.translate(
  'xpack.cases.templates.successDeletingTemplate',
  {
    defaultMessage: 'Template deleted successfully',
  }
);

export const ERROR_EXPORTING_TEMPLATE = i18n.translate(
  'xpack.cases.templates.errorExportingTemplate',
  {
    defaultMessage: 'Error exporting template',
  }
);

export const SUCCESS_EXPORTING_TEMPLATE = i18n.translate(
  'xpack.cases.templates.successExportingTemplate',
  {
    defaultMessage: 'Template exported successfully',
  }
);

export const ERROR_BULK_DELETING_TEMPLATES = i18n.translate(
  'xpack.cases.templates.errorBulkDeletingTemplates',
  {
    defaultMessage: 'Error deleting templates',
  }
);

export const SUCCESS_BULK_DELETING_TEMPLATES = (count: number) =>
  i18n.translate('xpack.cases.templates.successBulkDeletingTemplates', {
    values: { count },
    defaultMessage: '{count, plural, one {# template} other {# templates}} deleted successfully',
  });

export const ERROR_BULK_EXPORTING_TEMPLATES = i18n.translate(
  'xpack.cases.templates.errorBulkExportingTemplates',
  {
    defaultMessage: 'Error exporting templates',
  }
);

export const SUCCESS_BULK_EXPORTING_TEMPLATES = (count: number) =>
  i18n.translate('xpack.cases.templates.successBulkExportingTemplates', {
    values: { count },
    defaultMessage: '{count, plural, one {# template} other {# templates}} exported successfully',
  });

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

export const COLUMN_AUTHOR = i18n.translate('xpack.cases.templates.column.author', {
  defaultMessage: 'Author',
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

export const CLONE_TEMPLATE = i18n.translate('xpack.cases.templates.cloneTemplate', {
  defaultMessage: 'Clone',
});

export const SET_AS_DEFAULT_TEMPLATE = i18n.translate(
  'xpack.cases.templates.setAsDefaultTemplate',
  {
    defaultMessage: 'Set as default',
  }
);

export const EXPORT_TEMPLATE = i18n.translate('xpack.cases.templates.exportTemplate', {
  defaultMessage: 'Export',
});

export const PREVIEW_TEMPLATE = i18n.translate('xpack.cases.templates.previewTemplate', {
  defaultMessage: 'Preview',
});

export const DELETE_TEMPLATE = i18n.translate('xpack.cases.templates.deleteTemplate', {
  defaultMessage: 'Delete',
});

export const SHOWING_TEMPLATES = (total: number) =>
  i18n.translate('xpack.cases.templates.showingTemplates', {
    values: { total },
    defaultMessage: 'of {total}',
  });

export const SHOWING_SELECTED_TEMPLATES = (count: number) =>
  i18n.translate('xpack.cases.templates.selectedTemplatesTitle', {
    values: { count },
    defaultMessage: 'Selected {count} {count, plural, =1 {template} other {templates}}',
  });

export const CLEAR_FILTERS = i18n.translate('xpack.cases.templates.clearFilters', {
  defaultMessage: 'Clear filters',
});

export const BULK_ACTIONS = i18n.translate('xpack.cases.templates.bulkActions', {
  defaultMessage: 'Bulk actions',
});

export const BULK_EXPORT_TEMPLATES = i18n.translate('xpack.cases.templates.bulkExportTemplates', {
  defaultMessage: 'Export',
});

export const BULK_DELETE_TEMPLATES = i18n.translate('xpack.cases.templates.bulkDeleteTemplates', {
  defaultMessage: 'Delete',
});

export const BULK_DELETE_TITLE = (count: number) =>
  i18n.translate('xpack.cases.templates.bulkDeleteTitle', {
    values: { count },
    defaultMessage: 'Delete {count, plural, one {# template} other {# templates}}?',
  });

export const BULK_DELETE_MESSAGE = (count: number) =>
  i18n.translate('xpack.cases.templates.bulkDeleteMessage', {
    values: { count },
    defaultMessage:
      'This action will permanently delete {count, plural, one {this template} other {these {count} templates}}.',
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
