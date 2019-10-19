/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { set } from 'lodash';
import { storeApmUiIndicesSavedObject } from '../../helpers/apm_ui_indices';
import { StringMap } from '../../../../typings/common';

export async function saveUiIndices({
  server,
  uiIndices
}: {
  server: Server;
  uiIndices: StringMap<string | undefined>;
}) {
  const uiIndicesSavedObject = Object.keys(uiIndices).reduce(
    (acc, key) => set(acc, key, uiIndices[key]),
    { apm_oss: {} }
  );
  return await storeApmUiIndicesSavedObject(server, uiIndicesSavedObject);
}
