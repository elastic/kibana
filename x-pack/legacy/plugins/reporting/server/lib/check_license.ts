/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { XPackInfo } from '../../../xpack_main/server/lib/xpack_info';
import { XPackInfoLicense } from '../../../xpack_main/server/lib/xpack_info_license';
import { ExportTypesRegistry, ExportTypeDefinition } from '../../types';

interface LicenseCheckResult {
  showLinks: boolean;
  enableLinks: boolean;
  message?: string;
}

const messages = {
  getUnavailable: () => {
    return 'You cannot use Reporting because license information is not available at this time.';
  },
  getExpired: (license: XPackInfoLicense) => {
    return `You cannot use Reporting because your ${license.getType()} license has expired.`;
  },
};

const makeManagementFeature = (exportTypes: Array<ExportTypeDefinition<any, any, any, any>>) => {
  return {
    id: 'management',
    checkLicense: (license: XPackInfoLicense | null) => {
      if (!license) {
        return {
          showLinks: true,
          enableLinks: false,
          message: messages.getUnavailable(),
        };
      }

      if (!license.isActive()) {
        return {
          showLinks: true,
          enableLinks: false,
          message: messages.getExpired(license),
        };
      }

      const validJobTypes = exportTypes
        .filter(exportType => license.isOneOf(exportType.validLicenses))
        .map(exportType => exportType.jobType);

      return {
        showLinks: validJobTypes.length > 0,
        enableLinks: validJobTypes.length > 0,
        jobTypes: validJobTypes,
      };
    },
  };
};

const makeExportTypeFeature = (exportType: ExportTypeDefinition<any, any, any, any>) => {
  return {
    id: exportType.id,
    checkLicense: (license: XPackInfoLicense | null) => {
      if (!license) {
        return {
          showLinks: true,
          enableLinks: false,
          message: messages.getUnavailable(),
        };
      }

      if (!license.isOneOf(exportType.validLicenses)) {
        return {
          showLinks: false,
          enableLinks: false,
          message: `Your ${license.getType()} license does not support ${
            exportType.name
          } Reporting. Please upgrade your license.`,
        };
      }

      if (!license.isActive()) {
        return {
          showLinks: true,
          enableLinks: false,
          message: messages.getExpired(license),
        };
      }

      return {
        showLinks: true,
        enableLinks: true,
      };
    },
  };
};

export function checkLicenseFactory(exportTypesRegistry: ExportTypesRegistry) {
  return function checkLicense(xpackInfo: XPackInfo) {
    const license = xpackInfo === null || !xpackInfo.isAvailable() ? null : xpackInfo.license;
    const exportTypes = Array.from(exportTypesRegistry.getAll());
    const reportingFeatures = [
      ...exportTypes.map(makeExportTypeFeature),
      makeManagementFeature(exportTypes),
    ];

    return reportingFeatures.reduce((result, feature) => {
      result[feature.id] = feature.checkLicense(license);
      return result;
    }, {} as Record<string, LicenseCheckResult>);
  };
}
