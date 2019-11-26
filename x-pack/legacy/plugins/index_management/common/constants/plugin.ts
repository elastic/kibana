/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LICENSE_TYPE_BASIC } from '../../../../common/constants';

export const PLUGIN = {
  ID: 'index_management',
  getI18nName: (i18n: any): string =>
    i18n.translate('xpack.idxMgmt.appTitle', {
      defaultMessage: 'Index Management',
    }),
  MINIMUM_LICENSE_REQUIRED: LICENSE_TYPE_BASIC,
};
