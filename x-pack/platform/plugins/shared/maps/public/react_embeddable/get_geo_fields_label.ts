/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export function getGeoFieldsLabel(geoFieldNames: string[]) {
  if (geoFieldNames.length === 0) {
    return '';
  }

  if (geoFieldNames.length === 1) {
    return geoFieldNames[0];
  }

  const connector = i18n.translate('xpack.maps.embeddable.geoFieldsConnector', {
    defaultMessage: ' and ',
  });

  if (geoFieldNames.length === 2) {
    return geoFieldNames[0] + connector + geoFieldNames[1];
  }

  return (
    geoFieldNames.slice(0, geoFieldNames.length - 1).join(', ') +
    ',' +
    connector +
    geoFieldNames[geoFieldNames.length - 1]
  );
}
