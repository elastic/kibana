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
} from '../../common/constants';
import { registerAnalytics } from '.';

describe('registerAnalytics', () => {
  // Each feature family registers from its own module, so the only thing tying a family to the
  // plugin is one call here. Losing that call registers nothing, and every report of an unregistered
  // event is then dropped with a console warning rather than a failure — so assert the wiring.
  it('registers the Field Library event types', () => {
    const analyticsService = coreMock.createSetup().analytics;

    registerAnalytics({ analyticsService });

    expect(
      (analyticsService.registerEventType as jest.Mock).mock.calls.map(
        ([options]) => options.eventType
      )
    ).toEqual(
      expect.arrayContaining([
        CASES_FIELD_DEFINITION_CREATED_EVENT_TYPE,
        CASES_FIELD_DEFINITION_UPDATED_EVENT_TYPE,
        CASES_FIELD_DEFINITION_DELETED_EVENT_TYPE,
      ])
    );
  });
});
