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
import { ToolingLog } from '@kbn/tooling-log';

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
