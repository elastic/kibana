/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityStoreIdType as browserEntityStoreIdType } from '@kbn/agentic-investigations-common';
import { entityStoreIdType } from './entity_store_id';

describe('entityStoreIdType', () => {
  it.each([
    'user:cfo@corp',
    'host:ws-finance-04',
    'service:orders-api',
    'ws-finance-04',
    'generic:thing',
    'host:',
    '',
  ])('matches the browser implementation for %p', (id) => {
    expect(entityStoreIdType(id)).toBe(browserEntityStoreIdType(id));
  });

  it('reads the type from an Entity Store id', () => {
    expect(entityStoreIdType('user:cfo@corp')).toBe('user');
    expect(entityStoreIdType('generic:thing')).toBeUndefined();
  });
});
