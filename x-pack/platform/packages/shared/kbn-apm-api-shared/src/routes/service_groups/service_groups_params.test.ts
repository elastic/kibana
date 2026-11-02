/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { serviceGroupDeleteRoute } from './delete_service_group';
import { serviceGroupRoute } from './get_service_group';
import { serviceGroupServicesRoute } from './lookup_services';
import { serviceGroupSaveRoute } from './save_service_group';

describe('serviceGroupDeleteRoute params', () => {
  it('accepts a serviceGroupId', () => {
    expectParseSuccess(
      serviceGroupDeleteRoute.params!.safeParse({ query: { serviceGroupId: 'abc' } })
    );
  });

  it('rejects a missing serviceGroupId', () => {
    expectParseError(serviceGroupDeleteRoute.params!.safeParse({ query: {} }));
  });
});

describe('serviceGroupRoute params', () => {
  it('accepts a serviceGroup', () => {
    expectParseSuccess(serviceGroupRoute.params!.safeParse({ query: { serviceGroup: 'abc' } }));
  });
});

describe('serviceGroupServicesRoute params', () => {
  it('accepts a range without kuery', () => {
    const result = serviceGroupServicesRoute.params!.shape.query.safeParse({
      start: '2023-01-01T00:00:00.000Z',
      end: '2023-01-02T00:00:00.000Z',
    });

    expectParseSuccess(result);
  });

  it('accepts an optional kuery', () => {
    const result = serviceGroupServicesRoute.params!.shape.query.safeParse({
      start: '2023-01-01T00:00:00.000Z',
      end: '2023-01-02T00:00:00.000Z',
      kuery: 'service.name:opbeans-java',
    });

    expectParseSuccess(result);
  });

  it('rejects a missing required range field', () => {
    expectParseError(serviceGroupServicesRoute.params!.shape.query.safeParse({}));
  });
});

describe('serviceGroupSaveRoute params', () => {
  it('accepts a body without an explicit query', () => {
    const result = serviceGroupSaveRoute.params!.safeParse({
      body: { groupName: 'my-group', kuery: 'service.name:opbeans-java' },
    });

    expectParseSuccess(result);
  });

  it('accepts optional query and body fields', () => {
    const result = serviceGroupSaveRoute.params!.safeParse({
      query: { serviceGroupId: 'abc' },
      body: {
        groupName: 'my-group',
        kuery: 'service.name:opbeans-java',
        description: 'desc',
        color: '#fff',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing required body field', () => {
    expectParseError(serviceGroupSaveRoute.params!.safeParse({ body: { groupName: 'my-group' } }));
  });
});
