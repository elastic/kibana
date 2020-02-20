/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const SHOWING_SIGNALS = (totalSignalsFormatted: string, totalSignals: number) =>
  i18n.translate('xpack.siem.detectionEngine.signals.utilityBar.showingSignalsTitle', {
    values: { totalSignalsFormatted, totalSignals },
    defaultMessage:
      'Showing {totalSignalsFormatted} {totalSignals, plural, =1 {signal} other {signals}}',
  });

export const SELECTED_SIGNALS = (selectedSignalsFormatted: string, selectedSignals: number) =>
  i18n.translate('xpack.siem.detectionEngine.signals.utilityBar.selectedSignalsTitle', {
    values: { selectedSignalsFormatted, selectedSignals },
    defaultMessage:
      'Selected {selectedSignalsFormatted} {selectedSignals, plural, =1 {signal} other {signals}}',
  });

export const SELECT_ALL_SIGNALS = (totalSignalsFormatted: string, totalSignals: number) =>
  i18n.translate('xpack.siem.detectionEngine.signals.utilityBar.selectAllSignalsTitle', {
    values: { totalSignalsFormatted, totalSignals },
    defaultMessage:
      'Select all {totalSignalsFormatted} {totalSignals, plural, =1 {signal} other {signals}}',
  });

export const CLEAR_SELECTION = i18n.translate(
  'xpack.siem.detectionEngine.signals.utilityBar.clearSelectionTitle',
  {
    defaultMessage: 'Clear selection',
  }
);

export const BATCH_ACTIONS = i18n.translate(
  'xpack.siem.detectionEngine.signals.utilityBar.batchActionsTitle',
  {
    defaultMessage: 'Batch actions',
  }
);

export const BATCH_ACTION_VIEW_SELECTED_IN_HOSTS = i18n.translate(
  'xpack.siem.detectionEngine.signals.utilityBar.batchActions.viewSelectedInHostsTitle',
  {
    defaultMessage: 'View selected in hosts',
  }
);

export const BATCH_ACTION_VIEW_SELECTED_IN_NETWORK = i18n.translate(
  'xpack.siem.detectionEngine.signals.utilityBar.batchActions.viewSelectedInNetworkTitle',
  {
    defaultMessage: 'View selected in network',
  }
);

export const BATCH_ACTION_VIEW_SELECTED_IN_TIMELINE = i18n.translate(
  'xpack.siem.detectionEngine.signals.utilityBar.batchActions.viewSelectedInTimelineTitle',
  {
    defaultMessage: 'View selected in timeline',
  }
);

export const BATCH_ACTION_OPEN_SELECTED = i18n.translate(
  'xpack.siem.detectionEngine.signals.utilityBar.batchActions.openSelectedTitle',
  {
    defaultMessage: 'Open selected',
  }
);

export const BATCH_ACTION_CLOSE_SELECTED = i18n.translate(
  'xpack.siem.detectionEngine.signals.utilityBar.batchActions.closeSelectedTitle',
  {
    defaultMessage: 'Close selected',
  }
);
