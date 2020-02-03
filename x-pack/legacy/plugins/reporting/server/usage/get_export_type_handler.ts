/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { XPackMainPlugin } from '../../../xpack_main/server/xpack_main';
import { ExportTypesRegistry } from '../lib/export_types_registry';

/*
 * Gets a handle to the Reporting export types registry and returns a few
 * functions for examining them
 * @return {Object} export type handler
 */
export function getExportTypesHandler(exportTypesRegistry: ExportTypesRegistry) {
  return {
    /*
     * Based on the X-Pack license and which export types are available,
     * returns an object where the keys are the export types and the values are
     * a boolean for whether or not the export type is provided by the license.
     * @param {Object} xpackInfo: xpack_main plugin info object
     * @return {Object} availability of each export type
     */
    getAvailability(xpackInfo: XPackMainPlugin['info']) {
      const exportTypesAvailability: { [exportType: string]: boolean } = {};
      const xpackInfoAvailable = xpackInfo && xpackInfo.isAvailable();
      const licenseType: string | undefined = xpackInfo.license.getType();
      if (!licenseType) {
        throw new Error('No license type returned from XPackMainPlugin#info!');
      }
      for (const exportType of exportTypesRegistry.getAll()) {
        exportTypesAvailability[exportType.jobType] = xpackInfoAvailable
          ? exportType.validLicenses.includes(licenseType)
          : false;
      }

      return exportTypesAvailability;
    },

    /*
     * @return {Number} the number of export types in the registry
     */
    getNumExportTypes() {
      return exportTypesRegistry.getSize();
    },
  };
}
