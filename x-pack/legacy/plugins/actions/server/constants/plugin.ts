/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LICENSE_TYPE_BASIC, LicenseType } from '../../../../common/constants';

export const PLUGIN = {
  ID: 'actions',
  MINIMUM_LICENSE_REQUIRED: LICENSE_TYPE_BASIC as LicenseType, // TODO: supposed to be changed up on requirements
  getI18nName: (i18n: any): string =>
    i18n.translate('xpack.actions.appName', {
      defaultMessage: 'Actions',
    }),
};
