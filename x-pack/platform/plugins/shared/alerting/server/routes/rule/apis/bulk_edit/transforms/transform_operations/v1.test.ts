/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformOperations } from './v1';

describe('transformOperations', () => {
  const isSystemAction = (id: string) => id === 'my-system-action-id';

  describe('actions', () => {
    const defaultAction = {
      id: 'default-action',
      params: {},
    };

    const systemAction = {
      id: 'my-system-action-id',
      params: {},
    };

    it('transform the actions correctly', async () => {
      expect(
        transformOperations({
          operations: [
            { field: 'actions', operation: 'add', value: [defaultAction, systemAction] },
          ],
          isSystemAction,
        })
      ).toEqual([
        {
          field: 'actions',
          operation: 'add',
          value: [
            {
              group: 'default',
              id: 'default-action',
              params: {},
            },
            { id: 'my-system-action-id', params: {} },
          ],
        },
      ]);
    });

    it('returns an empty array if the operations are empty', async () => {
      expect(
        transformOperations({
          operations: [],
          isSystemAction,
        })
      ).toEqual([]);
    });

    it('returns an empty array if the operations are undefined', async () => {
      expect(
        transformOperations({
          isSystemAction,
        })
      ).toEqual([]);
    });
  });
});
