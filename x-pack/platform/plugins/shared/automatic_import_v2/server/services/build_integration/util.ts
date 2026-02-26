/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dump } from 'js-yaml';
import type AdmZip from 'adm-zip';
import path from 'path';
import type { IntegrationManifest } from './types';

export const addManifestToZip = (
  zip: AdmZip,
  rootDir: string,
  manifest: IntegrationManifest
): void => {
  const yamlContent = dump(manifest, { lineWidth: -1 });
  zip.addFile(path.join(rootDir, 'manifest.yml'), Buffer.from(yamlContent));
};
