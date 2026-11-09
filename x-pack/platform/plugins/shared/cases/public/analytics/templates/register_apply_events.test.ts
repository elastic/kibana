/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import {
  CASES_TEMPLATE_APPLIED_EVENT_TYPE,
  CASES_TEMPLATE_APPLIED_ON_CREATE_EVENT_TYPE,
  CASES_TEMPLATE_CLEARED_EVENT_TYPE,
} from '../../../common/constants';
import { registerTemplateApplyEvents } from './register_apply_events';

describe('registerTemplateApplyEvents', () => {
  let analyticsService: ReturnType<typeof coreMock.createSetup>['analytics'];

  beforeEach(() => {
    jest.clearAllMocks();
    analyticsService = coreMock.createSetup().analytics;
    registerTemplateApplyEvents({ analyticsService });
  });

  const getSchema = (eventType: string) => {
    const call = (analyticsService.registerEventType as jest.Mock).mock.calls.find(
      ([options]) => options.eventType === eventType
    );

    return call?.[0].schema;
  };

  it('registers exactly the three apply-family event types', () => {
    expect(analyticsService.registerEventType).toHaveBeenCalledTimes(3);
    expect(
      (analyticsService.registerEventType as jest.Mock).mock.calls
        .map(([options]) => options.eventType)
        .sort()
    ).toEqual([
      CASES_TEMPLATE_APPLIED_EVENT_TYPE,
      CASES_TEMPLATE_APPLIED_ON_CREATE_EVENT_TYPE,
      CASES_TEMPLATE_CLEARED_EVENT_TYPE,
    ]);
  });

  it.each([
    [CASES_TEMPLATE_APPLIED_ON_CREATE_EVENT_TYPE, ['entry_point', 'owner']],
    [CASES_TEMPLATE_APPLIED_EVENT_TYPE, ['apply_mode', 'entry_point', 'owner']],
    [CASES_TEMPLATE_CLEARED_EVENT_TYPE, ['entry_point', 'owner']],
  ])('registers %s with exactly the documented fields', (eventType, expectedFields) => {
    expect(Object.keys(getSchema(eventType)).sort()).toEqual(expectedFields);
  });

  it.each([
    CASES_TEMPLATE_APPLIED_ON_CREATE_EVENT_TYPE,
    CASES_TEMPLATE_APPLIED_EVENT_TYPE,
    CASES_TEMPLATE_CLEARED_EVENT_TYPE,
  ])('declares every %s field as a required keyword with a description', (eventType) => {
    Object.values<{ type: string; _meta: { description: string; optional: boolean } }>(
      getSchema(eventType)
    ).forEach((field) => {
      expect(field.type).toBe('keyword');
      expect(field._meta.optional).toBe(false);
      expect(field._meta.description.length).toBeGreaterThan(0);
    });
  });

  it('registers no field that could carry a template identifier', () => {
    const allFields = [
      CASES_TEMPLATE_APPLIED_ON_CREATE_EVENT_TYPE,
      CASES_TEMPLATE_APPLIED_EVENT_TYPE,
      CASES_TEMPLATE_CLEARED_EVENT_TYPE,
    ].flatMap((eventType) => Object.keys(getSchema(eventType)));

    expect(allFields).not.toContain('template_id');
    expect(allFields).not.toContain('template_name');
    expect(allFields).not.toContain('template');
  });
});
