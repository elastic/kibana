/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve as pathResolve } from 'path';
import glob from 'glob';
import { ServerFacade } from '../../types';
import { PLUGIN_ID } from '../../common/constants';
import { oncePerServer } from './once_per_server';
import { LevelLogger } from './level_logger';
// @ts-ignore untype module TODO
import { ExportTypesRegistry } from '../../common/export_types_registry';

function scan(pattern: string) {
  return new Promise((resolve, reject) => {
    glob(pattern, {}, (err, files) => {
      if (err) {
        return reject(err);
      }

      resolve(files);
    });
  });
}

const pattern = pathResolve(__dirname, '../../export_types/*/server/index.[jt]s');
async function exportTypesRegistryFn(server: ServerFacade) {
  const logger = LevelLogger.createForServer(server, [PLUGIN_ID, 'exportTypes']);
  const exportTypesRegistry = new ExportTypesRegistry();
  const files: string[] = (await scan(pattern)) as string[];

  files.forEach(file => {
    logger.debug(`Found exportType at ${file}`);

    const { register } = require(file); // eslint-disable-line @typescript-eslint/no-var-requires
    register(exportTypesRegistry);
  });
  return exportTypesRegistry;
}

export const exportTypesRegistryFactory = oncePerServer(exportTypesRegistryFn);
