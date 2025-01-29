/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SELECTED_ALERTS = (selectedAlertsFormatted: string, selectedAlerts: number) =>
  i18n.translate('xpack.triggersActionsUI.toolbar.bulkActions.selectedAlertsTitle', {
    values: { selectedAlertsFormatted, selectedAlerts },
    defaultMessage:
      'Selected {selectedAlertsFormatted} {selectedAlerts, plural, =1 {alert} other {alerts}}',
  });

export const SELECT_ALL_ALERTS = (totalAlertsFormatted: string, totalAlerts: number) =>
  i18n.translate('xpack.triggersActionsUI.toolbar.bulkActions.selectAllAlertsTitle', {
    values: { totalAlertsFormatted, totalAlerts },
    defaultMessage:
      'Select all {totalAlertsFormatted} {totalAlerts, plural, =1 {alert} other {alerts}}',
  });

export const CLEAR_SELECTION = i18n.translate(
  'xpack.triggersActionsUI.toolbar.bulkActions.clearSelectionTitle',
  {
    defaultMessage: 'Clear selection',
  }
);

export const COLUMN_HEADER_ARIA_LABEL = i18n.translate(
  'xpack.triggersActionsUI.bulkActions.columnHeader.AriaLabel',
  {
    defaultMessage: 'Select all rows',
  }
);

export const SELECT_ROW_ARIA_LABEL = (displayedRowIndex: number) =>
  i18n.translate('xpack.triggersActionsUI.bulkActions.selectRowCheckbox.AriaLabel', {
    values: { displayedRowIndex },
    defaultMessage: 'Select row {displayedRowIndex}',
  });
