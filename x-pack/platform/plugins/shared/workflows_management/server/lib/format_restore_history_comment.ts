/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const formatRestoreHistoryComment = (sequence?: number): string => {
  if (sequence != null) {
    return i18n.translate('workflows.changeHistory.restoredFromVersion', {
      defaultMessage: 'Restored from v{version}',
      values: { version: sequence },
    });
  }

  return i18n.translate('workflows.changeHistory.restoredFromPreviousVersion', {
    defaultMessage: 'Restored from a previous version',
  });
};
