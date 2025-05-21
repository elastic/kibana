/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { getEMSSettings } from '../kibana_services';

export function getEmsUnavailableMessage(): string {
  const emsSettings = getEMSSettings();

  if (!emsSettings.isIncludeElasticMapsService()) {
    return i18n.translate('xpack.maps.source.ems.disabledDescription', {
      defaultMessage:
        'Access to Elastic Maps Service has been disabled. Ask your system administrator to set "map.includeElasticMapsService" in kibana.yml.',
    });
  }

  if (emsSettings.isEMSUrlSet()) {
    if (!emsSettings.hasOnPremLicense()) {
      return i18n.translate('xpack.maps.source.ems.noOnPremLicenseDescription', {
        defaultMessage:
          'An enterprise license is required to connect to local Elastic Maps Server installations.',
      });
    } else {
      return i18n.translate('xpack.maps.source.ems.noOnPremConnectionDescription', {
        defaultMessage: 'Cannot connect to {host}.',
        values: {
          host: emsSettings.getEMSRoot(),
        },
      });
    }
  }

  // Not sure why.
  return i18n.translate('xpack.maps.source.ems.noAccessDescription', {
    defaultMessage:
      'Kibana is unable to access Elastic Maps Service. Contact your system administrator.',
  });
}
