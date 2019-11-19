/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { ML_BREADCRUMB } from '../breadcrumbs';

export function getDataFrameAnalyticsBreadcrumbs() {
  return [
    ML_BREADCRUMB,
    {
      text: i18n.translate('xpack.ml.dataFrameAnalyticsBreadcrumbs.dataFrameLabel', {
        defaultMessage: 'Data Frame Analytics',
      }),
      href: '',
    },
  ];
}
