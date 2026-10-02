/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export * from '../../common/translations';

export const INCIDENT_MANAGEMENT_SYSTEM_TITLE = i18n.translate(
  'xpack.cases.configureCases.incidentManagementSystemTitle',
  {
    defaultMessage: 'External incident management system',
  }
);

export const INCIDENT_MANAGEMENT_SYSTEM_DESC = i18n.translate(
  'xpack.cases.configureCases.incidentManagementSystemDesc',
  {
    defaultMessage:
      'Connect your cases to an external incident management system. You can then push case data as an incident in a third-party system.',
  }
);

export const INCIDENT_MANAGEMENT_SYSTEM_LABEL = i18n.translate(
  'xpack.cases.configureCases.incidentManagementSystemLabel',
  {
    defaultMessage: 'Incident management system',
  }
);

export const CONNECTOR_DROPDOWN_LABEL = i18n.translate(
  'xpack.cases.configureCases.connectorDropdownLabel',
  {
    defaultMessage: 'Connector dropdown',
  }
);

export const ADD_NEW_CONNECTOR = i18n.translate('xpack.cases.configureCases.addNewConnector', {
  defaultMessage: 'Add new connector',
});

export const ADD_CONNECTOR = i18n.translate('xpack.cases.configureCases.addConnector', {
  defaultMessage: 'Add connector',
});

export const CASE_CLOSURE_OPTIONS_TITLE = i18n.translate(
  'xpack.cases.configureCases.caseClosureOptionsTitle',
  {
    defaultMessage: 'Case closures',
  }
);

export const CASE_CLOSURE_OPTIONS_DESC = i18n.translate(
  'xpack.cases.configureCases.caseClosureOptionsDesc',
  {
    defaultMessage:
      'Define how to close your cases. Automatic closures require an established connection to an external incident management system.',
  }
);

export const CASE_CLOSURE_OPTIONS_LABEL = i18n.translate(
  'xpack.cases.configureCases.caseClosureOptionsLabel',
  {
    defaultMessage: 'Case closure options',
  }
);

export const CASE_CLOSURE_OPTIONS_MANUAL = i18n.translate(
  'xpack.cases.configureCases.caseClosureOptionsManual',
  {
    defaultMessage: 'Manually close cases',
  }
);

export const CASE_CLOSURE_OPTIONS_NEW_INCIDENT = i18n.translate(
  'xpack.cases.configureCases.caseClosureOptionsNewIncident',
  {
    defaultMessage: 'Automatically close cases when pushing new incident to external system',
  }
);

export const FIELD_MAPPING_TITLE = (thirdPartyName: string): string =>
  i18n.translate('xpack.cases.configureCases.fieldMappingTitle', {
    values: { thirdPartyName },
    defaultMessage: '{ thirdPartyName } field mappings',
  });

export const FIELD_MAPPING_DESC = (thirdPartyName: string): string =>
  i18n.translate('xpack.cases.configureCases.fieldMappingDesc', {
    values: { thirdPartyName },
    defaultMessage:
      'Map Case fields to { thirdPartyName } fields when pushing data to { thirdPartyName }. Field mappings require an established connection to { thirdPartyName }.',
  });

export const FIELD_MAPPING_DESC_ERR = (thirdPartyName: string): string =>
  i18n.translate('xpack.cases.configureCases.fieldMappingDescErr', {
    values: { thirdPartyName },
    defaultMessage: 'Failed to retrieve mappings for { thirdPartyName }.',
  });

export const FIELD_MAPPING_FIRST_COL = i18n.translate(
  'xpack.cases.configureCases.fieldMappingFirstCol',
  {
    defaultMessage: 'Kibana case field',
  }
);

export const FIELD_MAPPING_SECOND_COL = (thirdPartyName: string): string =>
  i18n.translate('xpack.cases.configureCases.fieldMappingSecondCol', {
    values: { thirdPartyName },
    defaultMessage: '{ thirdPartyName } field',
  });

export const FIELD_MAPPING_THIRD_COL = i18n.translate(
  'xpack.cases.configureCases.fieldMappingThirdCol',
  {
    defaultMessage: 'On edit and update',
  }
);

export const CANCEL = i18n.translate('xpack.cases.configureCases.cancelButton', {
  defaultMessage: 'Cancel',
});

export const SAVE = i18n.translate('xpack.cases.configureCases.saveButton', {
  defaultMessage: 'Save',
});

export const WARNING_NO_CONNECTOR_TITLE = i18n.translate(
  'xpack.cases.configureCases.warningTitle',
  {
    defaultMessage: 'Warning',
  }
);

export const COMMENT = i18n.translate('xpack.cases.configureCases.commentMapping', {
  defaultMessage: 'Comments',
});

export const UPDATE_SELECTED_CONNECTOR = (connectorName: string): string =>
  i18n.translate('xpack.cases.configureCases.updateSelectedConnector', {
    values: { connectorName },
    defaultMessage: 'Update { connectorName }',
  });

export const DEPRECATED_TOOLTIP_TEXT = i18n.translate(
  'xpack.cases.configureCases.deprecatedTooltipText',
  {
    defaultMessage: 'deprecated',
  }
);

export const DEPRECATED_TOOLTIP_CONTENT = i18n.translate(
  'xpack.cases.configureCases.deprecatedTooltipContent',
  {
    defaultMessage: 'This connector is deprecated. Update it, or create a new one.',
  }
);

export const CONFIGURE_CASES_PAGE_TITLE = i18n.translate('xpack.cases.configureCases.headerTitle', {
  defaultMessage: 'Settings',
});

export const CASES_WEBHOOK_MAPPINGS = i18n.translate(
  'xpack.cases.configureCases.casesWebhookMappings',
  {
    defaultMessage:
      'Webhook - Case Management field mappings are configured in the connector settings in the third-party REST API JSON.',
  }
);

export const ADD_CUSTOM_FIELD = i18n.translate(
  'xpack.cases.configureCases.customFields.addCustomField',
  {
    defaultMessage: 'Add field',
  }
);

export const EDIT_CUSTOM_FIELD = i18n.translate(
  'xpack.cases.configureCases.customFields.editCustomField',
  {
    defaultMessage: 'Edit field',
  }
);

export const CREATE_TEMPLATE = i18n.translate('xpack.cases.configureCases.templates.flyoutTitle', {
  defaultMessage: 'Add template',
});

export const EDIT_TEMPLATE = i18n.translate('xpack.cases.configureCases.templates.editTemplate', {
  defaultMessage: 'Edit template',
});

export const ADD_OBSERVABLE_TYPE = i18n.translate(
  'xpack.cases.configureCases.observableTypes.addObservableType',
  {
    defaultMessage: 'Add observable type',
  }
);

export const EDIT_OBSERVABLE_TYPE = i18n.translate(
  'xpack.cases.configureCases.observableTypes.editObservableType',
  {
    defaultMessage: 'Edit observable type',
  }
);

export const SHOW_ALL_TEMPLATES = i18n.translate(
  'xpack.cases.configureCases.templates.showAllTemplates',
  {
    defaultMessage: 'Show all templates',
  }
);

export const LEGACY_CUSTOM_FIELDS_AND_TEMPLATES_TITLE = i18n.translate(
  'xpack.cases.configureCases.legacyCustomFieldsAndTemplatesTitle',
  {
    defaultMessage: 'Legacy custom fields and templates',
  }
);

export const CUSTOM_FIELDS_AND_TEMPLATES_TITLE = i18n.translate(
  'xpack.cases.configureCases.customFieldsAndTemplatesTitle',
  {
    defaultMessage: 'Custom fields and templates',
  }
);

export const CUSTOM_FIELDS_AND_TEMPLATES_DESCRIPTION = i18n.translate(
  'xpack.cases.configureCases.customFieldsAndTemplatesDescription',
  {
    defaultMessage:
      'Add custom fields for customized case collaboration and create templates that automatically populate values in new cases.',
  }
);

export const SHOW_LEGACY_CUSTOM_FIELDS_AND_TEMPLATES = i18n.translate(
  'xpack.cases.configureCases.showLegacyCustomFieldsAndTemplates',
  {
    defaultMessage: 'Show deprecated custom fields and templates',
  }
);

export const SHOW_LEGACY_CUSTOM_FIELDS_SWITCH_DISABLED_HELP = i18n.translate(
  'xpack.cases.configureCases.showLegacyCustomFieldsSwitchDisabledHelp',
  {
    defaultMessage:
      'Required custom fields without a default value must stay visible so cases can still be created. Add a default or make them optional to disable this.',
  }
);

export const VIEW_NEW_CUSTOM_FIELDS = i18n.translate(
  'xpack.cases.configureCases.viewNewCustomFields',
  {
    defaultMessage: 'fields library',
  }
);

export const VIEW_NEW_TEMPLATES = i18n.translate('xpack.cases.configureCases.viewNewTemplates', {
  defaultMessage: 'new templates experience',
});

export const LEGACY_CUSTOM_FIELDS_LIST_TITLE = i18n.translate(
  'xpack.cases.configureCases.legacyCustomFieldsListTitle',
  {
    defaultMessage: 'Custom fields',
  }
);

export const LEGACY_TEMPLATES_LIST_TITLE = i18n.translate(
  'xpack.cases.configureCases.legacyTemplatesListTitle',
  {
    defaultMessage: 'Templates',
  }
);

export const ADD_LEGACY_CUSTOM_FIELD = i18n.translate(
  'xpack.cases.configureCases.addLegacyCustomField',
  {
    defaultMessage: 'Add legacy field',
  }
);

export const ADD_LEGACY_TEMPLATE = i18n.translate('xpack.cases.configureCases.addLegacyTemplate', {
  defaultMessage: 'Add legacy template',
});

export const DEPRECATED_BADGE = i18n.translate('xpack.cases.configureCases.deprecatedBadge', {
  defaultMessage: 'Deprecated',
});

export const EXTRACT_OBSERVABLES_DEFAULT_TITLE = i18n.translate(
  'xpack.cases.configureCases.extractObservablesDefaultTitle',
  {
    defaultMessage: 'Extract observables',
  }
);

export const EXTRACT_OBSERVABLES_DEFAULT_DESC = i18n.translate(
  'xpack.cases.configureCases.extractObservablesDefaultDesc',
  {
    defaultMessage:
      'Automatically extract observables from alerts and events when they attach to a new case. Individual cases can override this setting.',
  }
);

export const CASE_SETTINGS_TITLE = i18n.translate('xpack.cases.settings.title', {
  defaultMessage: 'Cases settings',
});

export const BACK_TO_CASES = i18n.translate('xpack.cases.settings.backToCases', {
  defaultMessage: 'Cases',
});

export const EXTERNAL_SYNC_TITLE = (connectorName: string): string =>
  i18n.translate('xpack.cases.configureCases.externalSyncTitle', {
    values: { connectorName },
    defaultMessage: 'Sync with {connectorName}',
  });

export const EXTERNAL_SYNC_DESC = (connectorName: string): string =>
  i18n.translate('xpack.cases.configureCases.externalSyncDesc', {
    values: { connectorName },
    defaultMessage:
      'Defaults for new cases that use {connectorName}. Each case can override them in its Connectors panel. Changes made in {connectorName} are applied when you select Sync from {connectorName} on a case.',
  });

export const EXTERNAL_SYNC_NO_CONNECTOR = i18n.translate(
  'xpack.cases.configureCases.externalSyncNoConnector',
  {
    defaultMessage: 'Select a connector to configure sync.',
  }
);

export const FIELD_SYNC_TITLE = i18n.translate('xpack.cases.configureCases.fieldSyncTitle', {
  defaultMessage: 'Field sync',
});

export const FIELD_SYNC_DESC = (connectorName: string): string =>
  i18n.translate('xpack.cases.configureCases.fieldSyncDesc', {
    values: { connectorName },
    defaultMessage:
      'Choose how each field moves between the case and {connectorName}. Conflict rules here override the default above for fields that pull.',
  });

export const FIELD_SYNC_CAPTION = (connectorName: string): string =>
  i18n.translate('xpack.cases.configureCases.fieldSyncCaption', {
    values: { connectorName },
    defaultMessage: 'Field sync for {connectorName}',
  });

export const FIELD_SYNC_COL_CASE_FIELD = i18n.translate(
  'xpack.cases.configureCases.fieldSyncColCaseField',
  {
    defaultMessage: 'Case field',
  }
);

export const FIELD_SYNC_COL_EXTERNAL_FIELD = (connectorName: string): string =>
  i18n.translate('xpack.cases.configureCases.fieldSyncColExternalField', {
    values: { connectorName },
    defaultMessage: '{connectorName} field',
  });

export const FIELD_SYNC_COL_DIRECTION = i18n.translate(
  'xpack.cases.configureCases.fieldSyncColDirection',
  {
    defaultMessage: 'Direction',
  }
);

export const FIELD_SYNC_COL_CONFLICT = i18n.translate(
  'xpack.cases.configureCases.fieldSyncColConflict',
  {
    defaultMessage: 'On conflict',
  }
);

export const FIELD_SYNC_FIELD_TITLE = i18n.translate(
  'xpack.cases.configureCases.fieldSyncFieldTitle',
  {
    defaultMessage: 'Title',
  }
);

export const FIELD_SYNC_FIELD_DESCRIPTION = i18n.translate(
  'xpack.cases.configureCases.fieldSyncFieldDescription',
  {
    defaultMessage: 'Description',
  }
);

export const FIELD_SYNC_FIELD_STATUS = i18n.translate(
  'xpack.cases.configureCases.fieldSyncFieldStatus',
  {
    defaultMessage: 'Status',
  }
);

export const FIELD_SYNC_FIELD_TAGS = i18n.translate(
  'xpack.cases.configureCases.fieldSyncFieldTags',
  {
    defaultMessage: 'Tags',
  }
);

export const FIELD_SYNC_FIELD_COMMENTS = i18n.translate(
  'xpack.cases.configureCases.fieldSyncFieldComments',
  {
    defaultMessage: 'Comments',
  }
);

export const FIELD_SYNC_EXTERNAL_STATUS = i18n.translate(
  'xpack.cases.configureCases.fieldSyncExternalStatus',
  {
    defaultMessage: 'Status (mapped automatically)',
  }
);

export const FIELD_SYNC_EXTERNAL_WEBHOOK = i18n.translate(
  'xpack.cases.configureCases.fieldSyncExternalWebhook',
  {
    defaultMessage: 'Set in the connector',
  }
);

export const FIELD_SYNC_EXTERNAL_NOT_MAPPED = i18n.translate(
  'xpack.cases.configureCases.fieldSyncExternalNotMapped',
  {
    defaultMessage: 'Not mapped',
  }
);

export const FIELD_SYNC_CATALOG_ERROR = (connectorName: string): string =>
  i18n.translate('xpack.cases.configureCases.fieldSyncCatalogError', {
    values: { connectorName },
    defaultMessage:
      '{connectorName} did not return its fields. Check the connector and its credentials.',
  });

export const FIELD_SYNC_EXTERNAL_MISSING = (connectorName: string): string =>
  i18n.translate('xpack.cases.configureCases.fieldSyncExternalMissing', {
    values: { connectorName },
    defaultMessage: '{connectorName} did not return this field. Sync will skip it.',
  });

export const FIELD_SYNC_DIRECTION_BOTH = i18n.translate(
  'xpack.cases.configureCases.fieldSyncDirectionBoth',
  {
    defaultMessage: 'Both ways',
  }
);

export const FIELD_SYNC_DIRECTION_PUSH = i18n.translate(
  'xpack.cases.configureCases.fieldSyncDirectionPush',
  {
    defaultMessage: 'Push only',
  }
);

export const FIELD_SYNC_DIRECTION_PULL = i18n.translate(
  'xpack.cases.configureCases.fieldSyncDirectionPull',
  {
    defaultMessage: 'Pull only',
  }
);

export const FIELD_SYNC_DIRECTION_OFF = i18n.translate(
  'xpack.cases.configureCases.fieldSyncDirectionOff',
  {
    defaultMessage: 'Off',
  }
);

export const FIELD_SYNC_DIRECTION_ARIA = (fieldLabel: string): string =>
  i18n.translate('xpack.cases.configureCases.fieldSyncDirectionAria', {
    values: { fieldLabel },
    defaultMessage: 'Direction for {fieldLabel}',
  });

export const FIELD_SYNC_CONFLICT_ARIA = (fieldLabel: string): string =>
  i18n.translate('xpack.cases.configureCases.fieldSyncConflictAria', {
    values: { fieldLabel },
    defaultMessage: 'On conflict for {fieldLabel}',
  });

export const FIELD_SYNC_CONFLICT_DEFAULT = i18n.translate(
  'xpack.cases.configureCases.fieldSyncConflictDefault',
  {
    defaultMessage: 'Use default',
  }
);

export const FIELD_SYNC_NOT_APPLICABLE = i18n.translate(
  'xpack.cases.configureCases.fieldSyncNotApplicable',
  {
    defaultMessage: 'Not applicable',
  }
);

export const EXTERNAL_FIELDS_TITLE = i18n.translate(
  'xpack.cases.configureCases.externalFieldsTitle',
  {
    defaultMessage: 'External fields',
  }
);

export const EXTERNAL_FIELDS_DESC = (connectorName: string): string =>
  i18n.translate('xpack.cases.configureCases.externalFieldsDesc', {
    values: { connectorName },
    defaultMessage:
      'Carry other {connectorName} fields onto cases. Pick a global case field for each external field you want to sync.',
  });

export const EXTERNAL_FIELDS_SEARCH = (connectorName: string): string =>
  i18n.translate('xpack.cases.configureCases.externalFieldsSearch', {
    values: { connectorName },
    defaultMessage: 'Search {connectorName} fields',
  });

export const EXTERNAL_FIELDS_CREATE_FIELD = i18n.translate(
  'xpack.cases.configureCases.externalFieldsCreateField',
  {
    defaultMessage: 'Create global field',
  }
);

export const EXTERNAL_FIELDS_NOT_SYNCED = i18n.translate(
  'xpack.cases.configureCases.externalFieldsNotSynced',
  {
    defaultMessage: 'Not synced',
  }
);

export const EXTERNAL_FIELDS_CAP = i18n.translate('xpack.cases.configureCases.externalFieldsCap', {
  defaultMessage: 'You can map up to 20 fields per connector.',
});

export const EXTERNAL_FIELDS_EMPTY = (connectorName: string): string =>
  i18n.translate('xpack.cases.configureCases.externalFieldsEmpty', {
    values: { connectorName },
    defaultMessage: '{connectorName} exposes no additional fields.',
  });

export const EXTERNAL_FIELDS_CAPTION = (connectorName: string): string =>
  i18n.translate('xpack.cases.configureCases.externalFieldsCaption', {
    values: { connectorName },
    defaultMessage: 'External fields of {connectorName}',
  });

export const EXTERNAL_FIELDS_CASE_FIELD_ARIA = (fieldLabel: string): string =>
  i18n.translate('xpack.cases.configureCases.externalFieldsCaseFieldAria', {
    values: { fieldLabel },
    defaultMessage: 'Case field for {fieldLabel}',
  });

export { CONFLICT_KEEP_EXTERNAL, CONFLICT_KEEP_KIBANA } from '../edit_connector/translations';
