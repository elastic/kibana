/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { i18n } from '@kbn/i18n';

export function getEmsUnavailableMessage() {
  const isEmsEnabled = chrome.getInjected('isEmsEnabled', true);
  if (isEmsEnabled) {
    return i18n.translate('xpack.maps.source.ems.noAccessDescription', {
      defaultMessage: 'Kibana is unable to access Elastic Maps Service. Contact your system administrator'
    });
  }

  return i18n.translate('xpack.maps.source.ems.disabledDescription', {
    defaultMessage: 'Access to Elastic Maps Service has been disabled. Ask your system administrator to set "map.includeElasticMapsService" in kibana.yml.'
  });
}
