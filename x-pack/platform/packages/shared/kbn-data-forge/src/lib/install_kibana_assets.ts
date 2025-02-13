/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
// eslint-disable-next-line import/no-extraneous-dependencies
import FormData from 'form-data';
import axios, { AxiosBasicCredentials } from 'axios';
import { isError } from 'lodash';
import { KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import { ToolingLog } from '@kbn/tooling-log';
import https from 'https';

export async function installKibanaAssets(
  filePath: string,
  kibanaUrl: string,
  userPassObject: AxiosBasicCredentials,
  logger: ToolingLog
) {
  try {
    // Create a readable stream for the file
    const fileStream = fs.createReadStream(filePath);

    // Create the multipart/form-data request body with the file content
    const formData = new FormData();
    formData.append('file', fileStream);

    const isHTTPS = new URL(kibanaUrl).protocol === 'https:';
    const httpsAgent = isHTTPS
      ? new https.Agent({
          ca: fs.readFileSync(KBN_CERT_PATH),
          key: fs.readFileSync(KBN_KEY_PATH),
          // hard-coded set to false like in packages/kbn-cli-dev-mode/src/base_path_proxy_server.ts
          rejectUnauthorized: false,
        })
      : undefined;

    // Send the saved objects to Kibana using the _import API
    const response = await axios.post(
      `${kibanaUrl}/api/saved_objects/_import?overwrite=true`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'kbn-xsrf': 'true',
        },
        auth: userPassObject,
        httpsAgent,
      }
    );

    logger.info(
      `Imported ${response.data.successCount} saved objects from "${filePath}" into Kibana`
    );
    return response.data;
  } catch (error) {
    if (isError(error)) {
      logger.error(
        `Error importing saved objects from "${filePath}" into Kibana: ${error.message}`
      );
    }
    throw error;
  }
}
