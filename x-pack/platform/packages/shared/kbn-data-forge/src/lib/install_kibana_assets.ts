/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
// eslint-disable-next-line import/no-extraneous-dependencies
import FormData from 'form-data';
import { isError } from 'lodash';
import { KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import type { ToolingLog } from '@kbn/tooling-log';
import { Agent } from 'undici';

export async function installKibanaAssets(
  filePath: string,
  kibanaUrl: string,
  userPassObject: { username: string; password: string },
  logger: ToolingLog
) {
  try {
    // Create a readable stream for the file
    const fileStream = fs.createReadStream(filePath);

    // Create the multipart/form-data request body with the file content
    const formData = new FormData();
    formData.append('file', fileStream);

    const isHTTPS = new URL(kibanaUrl).protocol === 'https:';
    const dispatcher = isHTTPS
      ? new Agent({
          connect: {
            ca: fs.readFileSync(KBN_CERT_PATH).toString(),
            key: fs.readFileSync(KBN_KEY_PATH).toString(),
            rejectUnauthorized: false,
          },
        })
      : undefined;

    // Ensure kibanaUrl ends with a single slash before appending the API path
    const baseUrl = kibanaUrl.endsWith('/') ? kibanaUrl.slice(0, -1) : kibanaUrl;
    const importUrl = `${baseUrl}/api/saved_objects/_import?overwrite=true`;

    const { username, password } = userPassObject;
    const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

    // Send the saved objects to Kibana using the _import API
    const response = await fetch(importUrl, {
      method: 'POST',
      body: formData as unknown as BodyInit,
      headers: {
        ...formData.getHeaders(),
        'kbn-xsrf': 'true',
        Authorization: authHeader,
      },
      ...(dispatcher ? { dispatcher } : {}),
    } as RequestInit);

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();

    logger.info(`Imported ${data.successCount} saved objects from "${filePath}" into Kibana`);
    return data;
  } catch (error) {
    if (isError(error)) {
      logger.error(
        `Error importing saved objects from "${filePath}" into Kibana: ${error.message}`
      );
    }
    throw error;
  }
}
