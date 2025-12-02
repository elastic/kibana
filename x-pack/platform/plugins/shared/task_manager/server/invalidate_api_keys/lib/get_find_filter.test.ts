/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { getFindFilter } from './get_find_filter';

let clock: sinon.SinonFakeTimers;
describe('getFindFilter', () => {
  beforeAll(() => {
    clock = sinon.useFakeTimers(new Date('2021-01-01T12:00:00.000Z'));
  });
  afterAll(() => clock.restore());
  beforeEach(() => {
    jest.clearAllMocks();
    clock.reset();
  });

  test('should build find filter with delay and empty excluded SO id array', () => {
    expect(
      getFindFilter({
        removalDelay: '1h',
        excludedSOIds: [],
        savedObjectType: 'api_key_pending_invalidation',
      })
    ).toEqual(`api_key_pending_invalidation.attributes.createdAt <= "2021-01-01T11:00:00.000Z"`);
  });

  test('should build find filter with delay and one excluded SO id array', () => {
    expect(
      getFindFilter({
        removalDelay: '1h',
        excludedSOIds: ['abc'],
        savedObjectType: 'api_key_pending_invalidation',
      })
    ).toEqual(
      `api_key_pending_invalidation.attributes.createdAt <= "2021-01-01T11:00:00.000Z" AND NOT api_key_pending_invalidation.id: "api_key_pending_invalidation:abc"`
    );
  });

  test('should build find filter with delay and multiple excluded SO id array', () => {
    expect(
      getFindFilter({
        removalDelay: '1h',
        excludedSOIds: ['abc', 'def'],
        savedObjectType: 'api_key_pending_invalidation',
      })
    ).toEqual(
      `api_key_pending_invalidation.attributes.createdAt <= "2021-01-01T11:00:00.000Z" AND NOT api_key_pending_invalidation.id: "api_key_pending_invalidation:abc" AND NOT api_key_pending_invalidation.id: "api_key_pending_invalidation:def"`
    );
  });

  test('should handle duplicate excluded SO ids', () => {
    expect(
      getFindFilter({
        excludedSOIds: ['abc', 'abc', 'abc', 'def'],
        removalDelay: '1h',
        savedObjectType: 'api_key_pending_invalidation',
      })
    ).toEqual(
      `api_key_pending_invalidation.attributes.createdAt <= "2021-01-01T11:00:00.000Z" AND NOT api_key_pending_invalidation.id: "api_key_pending_invalidation:abc" AND NOT api_key_pending_invalidation.id: "api_key_pending_invalidation:def"`
    );
  });
});
