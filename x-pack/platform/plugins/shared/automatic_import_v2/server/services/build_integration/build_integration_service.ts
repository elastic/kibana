/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import AdmZip from 'adm-zip';
import type { IntegrationAttributes } from '..';
import type { IntegrationManifest } from './types';
import { addManifestToZip } from './util';

const FORMAT_VERSION = '3.4.0';
const KIBANA_MIN_VERSION = '^9.3.0';

export interface BuildIntegrationPackageResult {
  buffer: Buffer;
  packageName: string;
}

const createManifest = (integration: IntegrationAttributes): IntegrationManifest => {
  const name = integration.integration_id;
  const title = integration.metadata?.title ?? name;
  const version = integration.metadata?.version ?? '0.0.0';
  const description = integration.metadata?.description ?? '';

  return {
    format_version: FORMAT_VERSION,
    name,
    title,
    version,
    description,
    type: 'integration',
    categories: ['security'],
    conditions: {
      kibana: {
        version: KIBANA_MIN_VERSION,
      },
    },
    policy_templates: [],
    owner: {
      github: '@elastic/integration-experience',
      type: 'community',
    },
  };
};

export const buildIntegrationPackage = async (
  integration: IntegrationAttributes
): Promise<BuildIntegrationPackageResult> => {
  const manifest = createManifest(integration);
  const packageName = `${manifest.name}-${manifest.version}`;

  const zip = new AdmZip();
  addManifestToZip(zip, packageName, manifest);

  const buffer = await zip.toBufferPromise();
  return { buffer, packageName };
};
