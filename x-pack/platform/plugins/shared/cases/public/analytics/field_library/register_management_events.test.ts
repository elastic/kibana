/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import {
  CASES_FIELD_DEFINITION_CREATED_EVENT_TYPE,
  CASES_FIELD_DEFINITION_DELETED_EVENT_TYPE,
  CASES_FIELD_DEFINITION_UPDATED_EVENT_TYPE,
} from '../../../common/constants';
import { registerFieldLibraryManagementEvents } from './register_management_events';

describe('registerFieldLibraryManagementEvents', () => {
  let analyticsService: ReturnType<typeof coreMock.createSetup>['analytics'];

  beforeEach(() => {
    jest.clearAllMocks();
    analyticsService = coreMock.createSetup().analytics;
    registerFieldLibraryManagementEvents({ analyticsService });
  });

  const getSchema = (eventType: string) => {
    const call = (analyticsService.registerEventType as jest.Mock).mock.calls.find(
      ([options]) => options.eventType === eventType
    );

    return call?.[0].schema;
  };

  it('registers exactly the three management event types', () => {
    expect(analyticsService.registerEventType).toHaveBeenCalledTimes(3);
    expect(
      (analyticsService.registerEventType as jest.Mock).mock.calls
        .map(([options]) => options.eventType)
        .sort()
    ).toEqual([
      CASES_FIELD_DEFINITION_CREATED_EVENT_TYPE,
      CASES_FIELD_DEFINITION_DELETED_EVENT_TYPE,
      CASES_FIELD_DEFINITION_UPDATED_EVENT_TYPE,
    ]);
  });

  it.each([
    [CASES_FIELD_DEFINITION_CREATED_EVENT_TYPE, ['is_global', 'owner']],
    [CASES_FIELD_DEFINITION_UPDATED_EVENT_TYPE, ['is_global', 'owner']],
    // Delete carries no scope: the row is gone, and the server delete counter has no split either.
    [CASES_FIELD_DEFINITION_DELETED_EVENT_TYPE, ['owner']],
  ])('registers %s with exactly the documented fields', (eventType, expectedFields) => {
    expect(Object.keys(getSchema(eventType)).sort()).toEqual(expectedFields);
  });

  it.each([
    CASES_FIELD_DEFINITION_CREATED_EVENT_TYPE,
    CASES_FIELD_DEFINITION_UPDATED_EVENT_TYPE,
    CASES_FIELD_DEFINITION_DELETED_EVENT_TYPE,
  ])('declares every %s field as required with a description', (eventType) => {
    Object.values<{ type: string; _meta: { description: string; optional: boolean } }>(
      getSchema(eventType)
    ).forEach((field) => {
      expect(field._meta.optional).toBe(false);
      expect(field._meta.description.length).toBeGreaterThan(0);
    });
  });

  it.each([
    [CASES_FIELD_DEFINITION_CREATED_EVENT_TYPE, { owner: 'keyword', is_global: 'boolean' }],
    [CASES_FIELD_DEFINITION_UPDATED_EVENT_TYPE, { owner: 'keyword', is_global: 'boolean' }],
    [CASES_FIELD_DEFINITION_DELETED_EVENT_TYPE, { owner: 'keyword' }],
  ])('declares every %s field with a bounded type', (eventType, expectedTypes) => {
    const schema = getSchema(eventType) as Record<string, { type: string }>;

    expect(
      Object.fromEntries(Object.entries(schema).map(([field, { type }]) => [field, type]))
    ).toEqual(expectedTypes);
  });

  it('registers no field that could carry field definition content', () => {
    const allFields = [
      CASES_FIELD_DEFINITION_CREATED_EVENT_TYPE,
      CASES_FIELD_DEFINITION_UPDATED_EVENT_TYPE,
      CASES_FIELD_DEFINITION_DELETED_EVENT_TYPE,
    ].flatMap((eventType) => Object.keys(getSchema(eventType)));

    expect(allFields).not.toContain('name');
    expect(allFields).not.toContain('label');
    expect(allFields).not.toContain('description');
    expect(allFields).not.toContain('definition');
    expect(allFields).not.toContain('field_definition_id');
  });
});
