/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export function getAppTitle() {
  return i18n.translate('xpack.maps.appTitle', {
    defaultMessage: 'Maps'
  });
}


export function getDataSourceLabel() {
  return i18n.translate('xpack.maps.source.dataSourceLabel', {
    defaultMessage: 'Data source'
  });
}

export function getUrlLabel() {
  return i18n.translate('xpack.maps.source.urlLabel', {
    defaultMessage: 'Url'
  });
}
