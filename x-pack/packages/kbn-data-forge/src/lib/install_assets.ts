/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { kibanaAssets } from '../data_sources';
import { Config } from '../types';
import { installKibanaAssets } from './install_kibana_assets';

export async function installAssets({ kibana, indexing }: Config, logger: ToolingLog) {
  if (!kibana.installAssets) {
    return Promise.resolve();
  }
  const filePaths = kibanaAssets[indexing.dataset];
  if (filePaths.length) {
    logger.info(`Installing Kibana assets for ${indexing.dataset}`);
    return Promise.all(
      filePaths.map((path) =>
        installKibanaAssets(
          path,
          kibana.host,
          {
            username: kibana.username,
            password: kibana.password,
          },
          logger
        )
      )
    );
  }
  return Promise.resolve();
}
