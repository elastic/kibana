/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { asSpaceId } from '@kbn/core-spaces-common';
import { resolveSpaceId } from './resolve_space_id';

describe('resolveSpaceId', () => {
  it('returns request.spaceId from core', () => {
    const request = httpServerMock.createKibanaRequest({ spaceId: asSpaceId('marketing') });

    expect(resolveSpaceId(request)).toBe('marketing');
  });
});
