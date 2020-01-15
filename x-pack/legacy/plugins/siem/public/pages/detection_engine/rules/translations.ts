/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const BACK_TO_DETECTION_ENGINE = i18n.translate(
  'xpack.siem.detectionEngine.rules.backOptionsHeader',
  {
    defaultMessage: 'Back to detection engine',
  }
);

export const IMPORT_RULE = i18n.translate('xpack.siem.detectionEngine.rules.importRuleTitle', {
  defaultMessage: 'Import rule…',
});

export const ADD_NEW_RULE = i18n.translate('xpack.siem.detectionEngine.rules.addNewRuleTitle', {
  defaultMessage: 'Add new rule',
});

export const PAGE_TITLE = i18n.translate('xpack.siem.detectionEngine.rules.pageTitle', {
  defaultMessage: 'Rules',
});

export const REFRESH = i18n.translate('xpack.siem.detectionEngine.rules.allRules.refreshTitle', {
  defaultMessage: 'Refresh',
});

export const BATCH_ACTIONS = i18n.translate(
  'xpack.siem.detectionEngine.rules.allRules.batchActionsTitle',
  {
    defaultMessage: 'Batch actions',
  }
);

export const BATCH_ACTION_ACTIVATE_SELECTED = i18n.translate(
  'xpack.siem.detectionEngine.rules.allRules.batchActions.activateSelectedTitle',
  {
    defaultMessage: 'Activate selected',
  }
);

export const BATCH_ACTION_ACTIVATE_SELECTED_ERROR = (totalRules: number) =>
  i18n.translate(
    'xpack.siem.detectionEngine.rules.allRules.batchActions.activateSelectedErrorTitle',
    {
      values: { totalRules },
      defaultMessage: 'Error activating {totalRules, plural, =1 {rule} other {rules}}…',
    }
  );

export const BATCH_ACTION_DEACTIVATE_SELECTED = i18n.translate(
  'xpack.siem.detectionEngine.rules.allRules.batchActions.deactivateSelectedTitle',
  {
    defaultMessage: 'Deactivate selected',
  }
);

export const BATCH_ACTION_DEACTIVATE_SELECTED_ERROR = (totalRules: number) =>
  i18n.translate(
    'xpack.siem.detectionEngine.rules.allRules.batchActions.deactivateSelectedErrorTitle',
    {
      values: { totalRules },
      defaultMessage: 'Error deactivating {totalRules, plural, =1 {rule} other {rules}}…',
    }
  );

export const BATCH_ACTION_EXPORT_SELECTED = i18n.translate(
  'xpack.siem.detectionEngine.rules.allRules.batchActions.exportSelectedTitle',
  {
    defaultMessage: 'Export selected',
  }
);

export const BATCH_ACTION_EDIT_INDEX_PATTERNS = i18n.translate(
  'xpack.siem.detectionEngine.rules.allRules.batchActions.editIndexPatternsTitle',
  {
    defaultMessage: 'Edit selected index patterns…',
  }
);

export const BATCH_ACTION_DELETE_SELECTED = i18n.translate(
  'xpack.siem.detectionEngine.rules.allRules.batchActions.deleteSelectedTitle',
  {
    defaultMessage: 'Delete selected…',
  }
);

export const BATCH_ACTION_DELETE_SELECTED_IMMUTABLE = i18n.translate(
  'xpack.siem.detectionEngine.rules.allRules.batchActions.deleteSelectedImmutableTitle',
  {
    defaultMessage: 'Selection contains immutable rules which cannot be deleted',
  }
);

export const BATCH_ACTION_DELETE_SELECTED_ERROR = (totalRules: number) =>
  i18n.translate(
    'xpack.siem.detectionEngine.rules.allRules.batchActions.deleteSelectedErrorTitle',
    {
      values: { totalRules },
      defaultMessage: 'Error deleting {totalRules, plural, =1 {rule} other {rules}}…',
    }
  );

export const EXPORT_FILENAME = i18n.translate(
  'xpack.siem.detectionEngine.rules.allRules.exportFilenameTitle',
  {
    defaultMessage: 'rules_export',
  }
);

export const SUCCESSFULLY_EXPORTED_RULES = (totalRules: number) =>
  i18n.translate('xpack.siem.detectionEngine.rules.allRules.successfullyExportedRulesTitle', {
    values: { totalRules },
    defaultMessage:
      'Successfully exported {totalRules, plural, =0 {all rules} =1 {{totalRules} rule} other {{totalRules} rules}}',
  });

export const ALL_RULES = i18n.translate('xpack.siem.detectionEngine.rules.allRules.tableTitle', {
  defaultMessage: 'All rules',
});

export const SEARCH_RULES = i18n.translate(
  'xpack.siem.detectionEngine.rules.allRules.searchAriaLabel',
  {
    defaultMessage: 'Search rules',
  }
);

export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.siem.detectionEngine.rules.allRules.searchPlaceholder',
  {
    defaultMessage: 'e.g. rule name',
  }
);

export const SHOWING_RULES = (totalRules: number) =>
  i18n.translate('xpack.siem.detectionEngine.rules.allRules.showingRulesTitle', {
    values: { totalRules },
    defaultMessage: 'Showing {totalRules} {totalRules, plural, =1 {rule} other {rules}}',
  });

export const SELECTED_RULES = (selectedRules: number) =>
  i18n.translate('xpack.siem.detectionEngine.rules.allRules.selectedRulesTitle', {
    values: { selectedRules },
    defaultMessage: 'Selected {selectedRules} {selectedRules, plural, =1 {rule} other {rules}}',
  });

export const EDIT_RULE_SETTINGS = i18n.translate(
  'xpack.siem.detectionEngine.rules.allRules.actions.editRuleSettingsDescription',
  {
    defaultMessage: 'Edit rule settings',
  }
);

export const DUPLICATE = i18n.translate(
  'xpack.siem.detectionEngine.rules.allRules.actions.duplicateTitle',
  {
    defaultMessage: 'Duplicate',
  }
);

export const DUPLICATE_RULE = i18n.translate(
  'xpack.siem.detectionEngine.rules.allRules.actions.duplicateRuleDescription',
  {
    defaultMessage: 'Duplicate rule…',
  }
);

export const SUCCESSFULLY_DUPLICATED_RULES = (totalRules: number) =>
  i18n.translate('xpack.siem.detectionEngine.rules.allRules.successfullyDuplicatedRulesTitle', {
    values: { totalRules },
    defaultMessage:
      'Successfully duplicated {totalRules, plural, =1 {{totalRules} rule} other {{totalRules} rules}}',
  });

export const DUPLICATE_RULE_ERROR = i18n.translate(
  'xpack.siem.detectionEngine.rules.allRules.actions.duplicateRuleErrorDescription',
  {
    defaultMessage: 'Error duplicating rule…',
  }
);

export const EXPORT_RULE = i18n.translate(
  'xpack.siem.detectionEngine.rules.allRules.actions.exportRuleDescription',
  {
    defaultMessage: 'Export rule',
  }
);

export const DELETE_RULE = i18n.translate(
  'xpack.siem.detectionEngine.rules.allRules.actions.deleteeRuleDescription',
  {
    defaultMessage: 'Delete rule…',
  }
);

export const COLUMN_RULE = i18n.translate(
  'xpack.siem.detectionEngine.rules.allRules.columns.ruleTitle',
  {
    defaultMessage: 'Rule',
  }
);

export const COLUMN_METHOD = i18n.translate(
  'xpack.siem.detectionEngine.rules.allRules.columns.methodTitle',
  {
    defaultMessage: 'Method',
  }
);

export const COLUMN_SEVERITY = i18n.translate(
  'xpack.siem.detectionEngine.rules.allRules.columns.severityTitle',
  {
    defaultMessage: 'Severity',
  }
);

export const COLUMN_LAST_COMPLETE_RUN = i18n.translate(
  'xpack.siem.detectionEngine.rules.allRules.columns.lastRunTitle',
  {
    defaultMessage: 'Last run',
  }
);

export const COLUMN_LAST_RESPONSE = i18n.translate(
  'xpack.siem.detectionEngine.rules.allRules.columns.lastResponseTitle',
  {
    defaultMessage: 'Last response',
  }
);

export const COLUMN_TAGS = i18n.translate(
  'xpack.siem.detectionEngine.rules.allRules.columns.tagsTitle',
  {
    defaultMessage: 'Tags',
  }
);

export const COLUMN_ACTIVATE = i18n.translate(
  'xpack.siem.detectionEngine.rules.allRules.columns.activateTitle',
  {
    defaultMessage: 'Activate',
  }
);

export const COLUMN_STATUS = i18n.translate(
  'xpack.siem.detectionEngine.rules.allRules.columns.currentStatusTitle',
  {
    defaultMessage: 'Current status',
  }
);
export const NO_STATUS = i18n.translate(
  'xpack.siem.detectionEngine.rules.allRules.columns.unknownStatusDescription',
  {
    defaultMessage: 'Unknown',
  }
);

export const DEFINE_RULE = i18n.translate('xpack.siem.detectionEngine.rules.defineRuleTitle', {
  defaultMessage: 'Define rule',
});

export const ABOUT_RULE = i18n.translate('xpack.siem.detectionEngine.rules.aboutRuleTitle', {
  defaultMessage: 'About rule',
});

export const SCHEDULE_RULE = i18n.translate('xpack.siem.detectionEngine.rules.scheduleRuleTitle', {
  defaultMessage: 'Schedule rule',
});

export const DEFINITION = i18n.translate('xpack.siem.detectionEngine.rules.stepDefinitionTitle', {
  defaultMessage: 'Definition',
});

export const ABOUT = i18n.translate('xpack.siem.detectionEngine.rules.stepAboutTitle', {
  defaultMessage: 'About',
});

export const SCHEDULE = i18n.translate('xpack.siem.detectionEngine.rules.stepScheduleTitle', {
  defaultMessage: 'Schedule',
});

export const OPTIONAL_FIELD = i18n.translate(
  'xpack.siem.detectionEngine.rules.optionalFieldDescription',
  {
    defaultMessage: 'Optional',
  }
);

export const CONTINUE = i18n.translate('xpack.siem.detectionEngine.rules.continueButtonTitle', {
  defaultMessage: 'Continue',
});

export const UPDATE = i18n.translate('xpack.siem.detectionEngine.rules.updateButtonTitle', {
  defaultMessage: 'Update',
});

export const DELETE = i18n.translate('xpack.siem.detectionEngine.rules.deleteDescription', {
  defaultMessage: 'Delete',
});
