/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LICENSE_TYPE_BASIC } from '../../../common/constants';

const ID = 'painless_ide';

export const PLUGIN = {
  ID: ID as typeof ID,
  getI18nName: (i18n: any): string =>
    i18n.translate('xpack.painless.appName', {
      defaultMessage: 'Painless IDE',
    }),
  MINIMUM_LICENSE_REQUIRED: LICENSE_TYPE_BASIC as typeof LICENSE_TYPE_BASIC,
};

export const API_BASE_PATH = `/api/${PLUGIN.ID}`;
