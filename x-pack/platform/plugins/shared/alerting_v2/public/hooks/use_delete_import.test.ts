/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { ALERTING_V2_INTERNAL_EXTERNAL_SOURCE_API_PATH } from '@kbn/alerting-v2-constants';
import { deleteImport } from './use_delete_import';

describe('deleteImport', () => {
  it('calls the external source delete API with the encoded id', async () => {
    const http = httpServiceMock.createStartContract();
    http.delete.mockResolvedValue(undefined);

    await deleteImport(http, 'import/1');

    expect(http.delete).toHaveBeenCalledWith(
      `${ALERTING_V2_INTERNAL_EXTERNAL_SOURCE_API_PATH}/import%2F1`
    );
  });
});
