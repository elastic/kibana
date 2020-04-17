/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LICENSE_TYPE_BASIC, LicenseType } from '../../../common/constants';

export const PLUGIN = {
  ID: 'rollup',
  MINIMUM_LICENSE_REQUIRED: LICENSE_TYPE_BASIC as LicenseType,
  getI18nName: (i18n: any): string => {
    return i18n.translate('xpack.rollupJobs.appName', {
      defaultMessage: 'Rollup jobs',
    });
  },
};

export * from '../../../../plugins/rollup/common';
