/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RawKibanaPrivileges } from '@kbn/security-plugin-types-common';

export interface PrivilegesAPIClientGetAllArgs {
  includeActions: boolean;
  /*
   * respectLicenseLevel is an internal optional parameter solely for getting all sub-feature
   * privileges to use in the UI. It is not meant for any other use.
   */
  respectLicenseLevel: boolean;
}

export abstract class PrivilegesAPIClientPublicContract {
  abstract getAll(args: PrivilegesAPIClientGetAllArgs): Promise<RawKibanaPrivileges>;
}
