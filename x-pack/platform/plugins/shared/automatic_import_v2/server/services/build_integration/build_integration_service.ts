/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import AdmZip from 'adm-zip';
import type { IntegrationAttributes } from '..';

export interface BuildIntegrationPackageResult {
  buffer: Buffer;
  packageName: string;
}

export const buildIntegrationPackage = async (
  integration: IntegrationAttributes
): Promise<BuildIntegrationPackageResult> => {
  const packageName = `${integration.integration_id}-${integration.metadata?.version ?? '0.0.0'}`;

  const zip = new AdmZip();
  zip.addFile(`${packageName}/`, Buffer.alloc(0));

  const buffer = await zip.toBufferPromise();
  return { buffer, packageName };
};
