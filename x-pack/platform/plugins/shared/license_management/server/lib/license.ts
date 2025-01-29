/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LicenseLicense } from '@elastic/elasticsearch/lib/api/types';
import { IScopedClusterClient } from '@kbn/core/server';
import { LicensingPluginStart } from '@kbn/licensing-plugin/server';

interface PutLicenseArg {
  acknowledge: boolean;
  client: IScopedClusterClient;
  licensing: LicensingPluginStart;
  licenses: LicenseLicense[];
}

export async function putLicense({ acknowledge, client, licensing, licenses }: PutLicenseArg) {
  try {
    const response = await client.asCurrentUser.license.post({
      licenses,
      acknowledge,
    });
    const { acknowledged, license_status: licenseStatus } = response;

    if (acknowledged && licenseStatus === 'valid') {
      await licensing.refresh();
    }

    return response;
  } catch (error) {
    return error.body;
  }
}
