/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface UMAuthContainer {
  info: {
    feature: (
      pluginId: string
    ) => {
      registerLicenseCheckResultsGenerator: (
        licenseCheckResultsHandler: (info: UMXPackLicenseStatus) => void
      ) => void;
    };
  };
  status: {
    once: (status: string, registerLicenseCheck: () => void) => void;
  };
}

export interface UMXPackLicenseStatus {
  license: {
    isActive: () => boolean | undefined;
    getType: () => string | undefined;
  };
}

export interface UMAuthAdapter {
  getLicenseType(): string | null;
  licenseIsActive(): boolean;
}
