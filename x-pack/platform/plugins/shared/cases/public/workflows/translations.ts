/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CREATE_CASE_STEP_LABEL = i18n.translate('xpack.cases.workflowSteps.createCase.label', {
  defaultMessage: 'Create case',
});

export const CREATE_CASE_STEP_DESCRIPTION = i18n.translate(
  'xpack.cases.workflowSteps.createCase.description',
  {
    defaultMessage: 'Creates a new case with the specified attributes',
  }
);

export const CREATE_CASE_STEP_DOCUMENTATION_DETAILS = i18n.translate(
  'xpack.cases.workflowSteps.createCase.documentation.details',
  {
    defaultMessage:
      'This step creates a new case in the cases system. You can specify title, description, tags, assignees, severity, category, connector configuration, sync settings, and custom fields. The step returns the complete created case object.',
  }
);

export const UPDATE_CASE_STEP_LABEL = i18n.translate('xpack.cases.workflowSteps.updateCase.label', {
  defaultMessage: 'Update case',
});

export const UPDATE_CASE_STEP_DESCRIPTION = i18n.translate(
  'xpack.cases.workflowSteps.updateCase.description',
  {
    defaultMessage: 'Updates a case with the provided fields',
  }
);

export const UPDATE_CASE_STEP_DOCUMENTATION_DETAILS = i18n.translate(
  'xpack.cases.workflowSteps.updateCase.documentation.details',
  {
    defaultMessage:
      'This step first fetches the case to retrieve the latest version and then applies the requested updates.',
  }
);

export const ADD_COMMENT_STEP_LABEL = i18n.translate('xpack.cases.workflowSteps.addComment.label', {
  defaultMessage: 'Add case comment',
});

export const ADD_COMMENT_STEP_DESCRIPTION = i18n.translate(
  'xpack.cases.workflowSteps.addComment.description',
  {
    defaultMessage: 'Adds a user comment to a case',
  }
);

export const ADD_COMMENT_STEP_DOCUMENTATION_DETAILS = i18n.translate(
  'xpack.cases.workflowSteps.addComment.documentation.details',
  {
    defaultMessage: 'This step appends a new user comment to the selected case.',
  }
);

export const GET_CASE_STEP_LABEL = i18n.translate('xpack.cases.workflowSteps.getCase.label', {
  defaultMessage: 'Get case by ID',
});

export const GET_CASE_STEP_DESCRIPTION = i18n.translate(
  'xpack.cases.workflowSteps.getCase.description',
  {
    defaultMessage: 'Retrieves a case using its unique identifier',
  }
);

export const GET_CASE_STEP_DOCUMENTATION_DETAILS = i18n.translate(
  'xpack.cases.workflowSteps.getCase.documentation.details',
  {
    defaultMessage:
      'This step retrieves a complete case object from the cases system using its ID. You can optionally include comments and attachments in the response.',
  }
);

export const CONNECTOR_TYPE_LABEL = i18n.translate(
  'xpack.cases.workflowSteps.shared.connectorTypeLabel',
  {
    defaultMessage: 'Connector type',
  }
);

export const SEVERITY_LABEL = i18n.translate('xpack.cases.workflowSteps.shared.severityLabel', {
  defaultMessage: 'Severity',
});

export const STATUS_LABEL = i18n.translate('xpack.cases.workflowSteps.shared.statusLabel', {
  defaultMessage: 'Status',
});

export const CATEGORY_LABEL = i18n.translate('xpack.cases.workflowSteps.shared.categoryLabel', {
  defaultMessage: 'Category',
});

export const TAG_LABEL = i18n.translate('xpack.cases.workflowSteps.shared.tagLabel', {
  defaultMessage: 'Tag',
});

export const ALERT_SYNC_LABEL = i18n.translate('xpack.cases.workflowSteps.shared.alertSyncLabel', {
  defaultMessage: 'alert sync',
});

export const OBSERVABLE_EXTRACTION_LABEL = i18n.translate(
  'xpack.cases.workflowSteps.shared.observableExtractionLabel',
  {
    defaultMessage: 'observable extraction',
  }
);

export const OWNER_VALID_MESSAGE = (owner: string) =>
  i18n.translate('xpack.cases.workflowSteps.shared.ownerValidMessage', {
    defaultMessage: 'Owner "{owner}" is valid for case workflows.',
    values: { owner },
  });

export const OWNER_NOT_SUPPORTED_MESSAGE = (owner: string, allowedValues: string) =>
  i18n.translate('xpack.cases.workflowSteps.shared.ownerNotSupportedMessage', {
    defaultMessage: 'Owner "{owner}" is not supported. Allowed values: {allowedValues}.',
    values: { owner, allowedValues },
  });

export const ENUM_VALUE_SUPPORTED_MESSAGE = (label: string, value: string) =>
  i18n.translate('xpack.cases.workflowSteps.shared.enumValueSupportedMessage', {
    defaultMessage: '{label} "{value}" is supported.',
    values: { label, value },
  });

export const ENUM_VALUE_NOT_SUPPORTED_MESSAGE = (
  label: string,
  value: string,
  allowedValues: string
) =>
  i18n.translate('xpack.cases.workflowSteps.shared.enumValueNotSupportedMessage', {
    defaultMessage: '{label} "{value}" is not supported. Allowed values: {allowedValues}.',
    values: { label, value, allowedValues },
  });

export const ENABLE_BOOLEAN_OPTION = (label: string) =>
  i18n.translate('xpack.cases.workflowSteps.shared.enableBooleanOption', {
    defaultMessage: 'Enable {label}',
    values: { label },
  });

export const DISABLE_BOOLEAN_OPTION = (label: string) =>
  i18n.translate('xpack.cases.workflowSteps.shared.disableBooleanOption', {
    defaultMessage: 'Disable {label}',
    values: { label },
  });

export const BOOLEAN_SET_TO_MESSAGE = (label: string, value: string) =>
  i18n.translate('xpack.cases.workflowSteps.shared.booleanSetToMessage', {
    defaultMessage: '{label} is set to "{value}".',
    values: { label, value },
  });

export const CONNECTOR_ACTION_TYPE_DESCRIPTION = (actionTypeId: string) =>
  i18n.translate('xpack.cases.workflowSteps.shared.connectorActionTypeDescription', {
    defaultMessage: 'Connector type: {actionTypeId}',
    values: { actionTypeId },
  });

export const CONNECTOR_AVAILABLE_MESSAGE = (connectorName: string) =>
  i18n.translate('xpack.cases.workflowSteps.shared.connectorAvailableMessage', {
    defaultMessage: 'Connector "{connectorName}" is available for case workflows.',
    values: { connectorName },
  });

export const CONNECTOR_NOT_FOUND_MESSAGE = (connectorValue: string) =>
  i18n.translate('xpack.cases.workflowSteps.shared.connectorNotFoundMessage', {
    defaultMessage:
      'Connector "{connectorValue}" was not found. Select an existing connector in Kibana connectors.',
    values: { connectorValue },
  });

export const TEMPLATE_CAN_BE_USED_MESSAGE = (template: string) =>
  i18n.translate('xpack.cases.workflowSteps.shared.templateCanBeUsedMessage', {
    defaultMessage: 'Template "{template}" can be used to prefill case attributes.',
    values: { template },
  });

export const TEMPLATE_NOT_FOUND_MESSAGE = (template: string) =>
  i18n.translate('xpack.cases.workflowSteps.shared.templateNotFoundMessage', {
    defaultMessage: 'Template "{template}" was not found in case configuration.',
    values: { template },
  });

export const CUSTOM_FIELD_KEY_TYPE_DESCRIPTION = (key: string, type: string) =>
  i18n.translate('xpack.cases.workflowSteps.shared.customFieldKeyTypeDescription', {
    defaultMessage: 'key: {key} | type: {type}',
    values: { key, type },
  });

export const CUSTOM_FIELD_AVAILABLE_MESSAGE = (customField: string) =>
  i18n.translate('xpack.cases.workflowSteps.shared.customFieldAvailableMessage', {
    defaultMessage: 'Custom field "{customField}" is available in case configuration.',
    values: { customField },
  });

export const CUSTOM_FIELD_NOT_FOUND_MESSAGE = (customField: string) =>
  i18n.translate('xpack.cases.workflowSteps.shared.customFieldNotFoundMessage', {
    defaultMessage: 'Custom field "{customField}" was not found in case configuration.',
    values: { customField },
  });

export const CUSTOM_FIELD_TYPE_USAGE_DESCRIPTION = (count: number) =>
  i18n.translate('xpack.cases.workflowSteps.shared.customFieldTypeUsageDescription', {
    defaultMessage:
      'Used by {count, plural, =1 {# configured custom field} other {# configured custom fields}}',
    values: { count },
  });

export const CUSTOM_FIELD_TYPE_CAN_BE_USED_MESSAGE = (customFieldType: string) =>
  i18n.translate('xpack.cases.workflowSteps.shared.customFieldTypeCanBeUsedMessage', {
    defaultMessage:
      'Custom field type "{customFieldType}" can be used with configured case custom fields.',
    values: { customFieldType },
  });

export const STRING_VALUE_AVAILABLE_MESSAGE = (label: string, value: string) =>
  i18n.translate('xpack.cases.workflowSteps.shared.stringValueAvailableMessage', {
    defaultMessage: '{label} "{value}" is available.',
    values: { label, value },
  });

export const STRING_VALUE_NOT_IN_SUGGESTIONS_MESSAGE = (label: string, value: string) =>
  i18n.translate('xpack.cases.workflowSteps.shared.stringValueNotInSuggestionsMessage', {
    defaultMessage: '{label} "{value}" is not in the current suggestions, but can still be used.',
    values: { label, value },
  });
