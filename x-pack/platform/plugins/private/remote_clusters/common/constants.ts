/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { LicenseType } from '@kbn/licensing-plugin/common/types';

const basicLicense: LicenseType = 'basic';

export const PLUGIN = {
  // Remote Clusters are used in both CCS and CCR, and CCS is available for all licenses.
  minimumLicenseType: basicLicense,
  getI18nName: (): string => {
    return i18n.translate('xpack.remoteClusters.appName', {
      defaultMessage: 'Remote Clusters',
    });
  },
};

export const MAJOR_VERSION = '8.5.0';

export const API_BASE_PATH = '/api/remote_clusters';

export const SNIFF_MODE = 'sniff';
export const PROXY_MODE = 'proxy';

export const getSecurityModel = (type: string) => {
  if (type === SECURITY_MODEL.CERTIFICATE) {
    return i18n.translate('xpack.remoteClusters.securityModelCert', {
      defaultMessage: 'Certificate',
    });
  }

  if (type === SECURITY_MODEL.API) {
    return i18n.translate('xpack.remoteClusters.securityModelApiKey', {
      defaultMessage: 'API key',
    });
  }

  return type;
};

// Hardcoded limit of maximum node connections allowed
export const MAX_NODE_CONNECTIONS = 2 ** 31 - 1; // 2147483647

export enum SECURITY_MODEL {
  API = 'api_key',
  CERTIFICATE = 'certificate',
}
