/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const AUTHENTICATIONS_COUNT = i18n.translate(
  'xpack.siem.authenticationsOverTime.authenticationCountTitle',
  {
    defaultMessage: 'Authentications count',
  }
);

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.siem.authenticationsOverTime.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {authentication} other {authentications}}`,
  });
