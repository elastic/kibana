/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate('xpack.siem.detectionEngine.pageTitle', {
  defaultMessage: 'Detection engine',
});

export const SIGNALS_TABLE_TITLE = i18n.translate('xpack.siem.detectionEngine.signals.tableTitle', {
  defaultMessage: 'Signals',
});

export const SIGNALS_DOCUMENT_TYPE = i18n.translate(
  'xpack.siem.detectionEngine.signals.documentTypeTitle',
  {
    defaultMessage: 'Signals',
  }
);

export const OPEN_SIGNALS = i18n.translate('xpack.siem.detectionEngine.signals.openSignalsTitle', {
  defaultMessage: 'Open signals',
});

export const CLOSED_SIGNALS = i18n.translate(
  'xpack.siem.detectionEngine.signals.closedSignalsTitle',
  {
    defaultMessage: 'Closed signals',
  }
);

export const LOADING_SIGNALS = i18n.translate(
  'xpack.siem.detectionEngine.signals.loadingSignalsTitle',
  {
    defaultMessage: 'Loading Signals',
  }
);

export const TOTAL_COUNT_OF_SIGNALS = i18n.translate(
  'xpack.siem.detectionEngine.signals.totalCountOfSignalsTitle',
  {
    defaultMessage: 'signals match the search criteria',
  }
);

export const SIGNALS_HEADERS_RULE = i18n.translate(
  'xpack.siem.eventsViewer.signals.defaultHeaders.ruleTitle',
  {
    defaultMessage: 'Rule',
  }
);

export const SIGNALS_HEADERS_VERSION = i18n.translate(
  'xpack.siem.eventsViewer.signals.defaultHeaders.versionTitle',
  {
    defaultMessage: 'Version',
  }
);

export const SIGNALS_HEADERS_METHOD = i18n.translate(
  'xpack.siem.eventsViewer.signals.defaultHeaders.methodTitle',
  {
    defaultMessage: 'Method',
  }
);

export const SIGNALS_HEADERS_SEVERITY = i18n.translate(
  'xpack.siem.eventsViewer.signals.defaultHeaders.severityTitle',
  {
    defaultMessage: 'Severity',
  }
);

export const SIGNALS_HEADERS_RISK_SCORE = i18n.translate(
  'xpack.siem.eventsViewer.signals.defaultHeaders.riskScoreTitle',
  {
    defaultMessage: 'Risk Score',
  }
);

export const ACTION_OPEN_SIGNAL = i18n.translate(
  'xpack.siem.detectionEngine.signals.actions.openSignalTitle',
  {
    defaultMessage: 'Open signal',
  }
);

export const ACTION_CLOSE_SIGNAL = i18n.translate(
  'xpack.siem.detectionEngine.signals.actions.closeSignalTitle',
  {
    defaultMessage: 'Close signal',
  }
);

export const ACTION_VIEW_IN_TIMELINE = i18n.translate(
  'xpack.siem.detectionEngine.signals.actions.viewInTimelineTitle',
  {
    defaultMessage: 'View in timeline',
  }
);
