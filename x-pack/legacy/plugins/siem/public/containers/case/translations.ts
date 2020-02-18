/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ERROR_TITLE = i18n.translate('xpack.siem.containers.case.errorTitle', {
  defaultMessage: 'Error fetching data',
});

export const TAG_FETCH_FAILURE = i18n.translate(
  'xpack.siem.containers.case.tagFetchFailDescription',
  {
    defaultMessage: 'Failed to fetch Tags',
  }
);
