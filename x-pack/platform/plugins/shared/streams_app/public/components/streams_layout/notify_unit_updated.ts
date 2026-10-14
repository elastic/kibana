/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

/** Confirms a source or destination delete after the unit has been persisted. */
export const notifyUnitUpdated = (toasts: CoreStart['notifications']['toasts']): void => {
  toasts.addSuccess({
    title: i18n.translate('xpack.streams.unit.updatedSuccessTitle', {
      defaultMessage: 'Unit was updated',
    }),
  });
};
