/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate('xpack.siem.detectionEngine.rules.pageTitle', {
  defaultMessage: 'Rules',
});

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
