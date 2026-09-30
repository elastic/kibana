/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import {
  CASES_STATUS_CHANGED_EVENT_TYPE,
  CASES_STATUS_CONFIGURATION_EDITED_EVENT_TYPE,
} from '../../../common/constants';
import { registerStatusEvents } from './register_events';

describe('registerStatusEvents', () => {
  let analyticsService: ReturnType<typeof coreMock.createSetup>['analytics'];

  beforeEach(() => {
    jest.clearAllMocks();
    analyticsService = coreMock.createSetup().analytics;
    registerStatusEvents({ analyticsService });
  });

  const getSchema = (eventType: string) => {
    const call = (analyticsService.registerEventType as jest.Mock).mock.calls.find(
      ([options]) => options.eventType === eventType
    );

    return call?.[0].schema;
  };

  it('registers exactly the two status event types', () => {
    expect(analyticsService.registerEventType).toHaveBeenCalledTimes(2);
    expect(
      (analyticsService.registerEventType as jest.Mock).mock.calls
        .map(([options]) => options.eventType)
        .sort()
    ).toEqual([CASES_STATUS_CHANGED_EVENT_TYPE, CASES_STATUS_CONFIGURATION_EDITED_EVENT_TYPE]);
  });

  it.each([
    [CASES_STATUS_CHANGED_EVENT_TYPE, ['category', 'entry_point', 'is_custom', 'owner']],
    [CASES_STATUS_CONFIGURATION_EDITED_EVENT_TYPE, ['action', 'category', 'owner']],
  ])('registers %s with exactly the documented fields', (eventType, expectedFields) => {
    expect(Object.keys(getSchema(eventType)).sort()).toEqual(expectedFields);
  });

  it('never registers a field that could carry a status label or key', () => {
    const allFields = [
      CASES_STATUS_CHANGED_EVENT_TYPE,
      CASES_STATUS_CONFIGURATION_EDITED_EVENT_TYPE,
    ].flatMap((eventType) => Object.keys(getSchema(eventType)));

    expect(allFields).not.toContain('status_key');
    expect(allFields).not.toContain('label');
  });
});
