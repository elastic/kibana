/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';
import { parse, stringify } from 'yaml';
import { REPO_ROOT } from '@kbn/repo-info';
import { writeFile } from './file_utils';

export async function writeKibanaConfig(
  cb: (config: Record<string, any>) => Promise<Record<string, any>>
): Promise<void> {
  const configFilePath = Path.join(REPO_ROOT, 'config/kibana.dev.yml');

  // const configContent = await require('fs').promises.readFile(configFilePath, 'utf8');
  const config = parse(configFilePath) as Record<string, string>;

  const result = await cb(config);

  const fileContent = stringify(result);

  await writeFile(configFilePath, fileContent);
}
