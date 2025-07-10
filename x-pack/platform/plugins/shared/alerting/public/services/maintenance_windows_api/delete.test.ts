/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { deleteMaintenanceWindow } from './delete';

const http = httpServiceMock.createStartContract();

beforeEach(() => jest.resetAllMocks());

describe('deleteMaintenanceWindow', () => {
  test('should call delete maintenance window api', async () => {
    await deleteMaintenanceWindow({
      http,
      maintenanceWindowId: '123',
    });
    expect(http.delete.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/maintenance_window/123",
      ]
    `);
  });
});
