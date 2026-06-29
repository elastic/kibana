/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformFindMutedAlertInstancesBody } from './v1';

describe('transformFindMutedAlertInstancesBody', () => {
  it('maps all provided fields to the application options shape', () => {
    expect(
      transformFindMutedAlertInstancesBody({
        per_page: 20,
        page: 2,
        filter: 'alert.id: alert:rule-1',
      })
    ).toEqual({
      perPage: 20,
      page: 2,
      filter: 'alert.id: alert:rule-1',
    });
  });

  it('returns an empty object when no fields are provided', () => {
    expect(transformFindMutedAlertInstancesBody({})).toEqual({});
  });

  it('omits fields that are not provided', () => {
    expect(transformFindMutedAlertInstancesBody({ page: 3 })).toEqual({ page: 3 });
  });

  it('omits falsy values', () => {
    expect(
      transformFindMutedAlertInstancesBody({ per_page: 0, page: 0, filter: '' })
    ).toEqual({});
  });
});
