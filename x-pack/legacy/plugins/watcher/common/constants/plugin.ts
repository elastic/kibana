/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LICENSE_TYPE_GOLD, LicenseType } from '../../../../common/constants';

export const PLUGIN = {
  ID: 'watcher',
  MINIMUM_LICENSE_REQUIRED: LICENSE_TYPE_GOLD as LicenseType,
  getI18nName: (i18n: any): string => {
    return i18n.translate('xpack.watcher.appName', {
      defaultMessage: 'Watcher',
    });
  },
};
