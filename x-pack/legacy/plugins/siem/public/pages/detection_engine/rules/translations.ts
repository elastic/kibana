/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

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

export const BATCH_ACTION_DEACTIVATE_SELECTED = i18n.translate(
  'xpack.siem.detectionEngine.rules.allRules.batchActions.deactivateSelectedTitle',
  {
    defaultMessage: 'Deactivate selected',
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

export const ALL_RULES = i18n.translate('xpack.siem.detectionEngine.rules.allRules.tableTitle', {
  defaultMessage: 'All rules',
});

export const SEARCH_RULES = i18n.translate(
  'xpack.siem.detectionEngine.rules.allRules.searchTitle',
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
