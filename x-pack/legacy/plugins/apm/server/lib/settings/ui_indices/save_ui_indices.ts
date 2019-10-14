/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { set } from 'lodash';
import { getSavedObjectsClient } from '../../helpers/saved_objects_client';

export async function saveUiIndices({
  server,
  uiIndices
}: {
  server: Server;
  uiIndices: { [key: string]: string | undefined };
}) {
  const uiIndicesSavedObject = Object.keys(uiIndices).reduce(
    (acc, key) => set(acc, key, uiIndices[key]),
    {}
  );

  const savedObjectsClient = getSavedObjectsClient(server, 'data');
  try {
    await savedObjectsClient.create('apm-ui-indices', uiIndicesSavedObject, {
      id: 'apm-ui-indices',
      overwrite: true
    });
  } catch (err) {
    server.log('error', err);
    throw err;
  }
  return null;
}
