/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timelineEventsLastEventTimeRequestSchema } from './events_last_event_time';
import { mockBaseTimelineRequest } from './mocks/base_timeline_request';

const mockEventsLastEventTimeRequest = {
  ...mockBaseTimelineRequest,
  // Remove fields that are omitted in the schema
  runtimeMappings: undefined,
  filterQuery: undefined,
  timerange: undefined,
  // Add eventsLastEventTime specific fields
  factoryQueryType: 'eventsLastEventTime',
  indexKey: 'hosts',
  details: {},
};

describe('timelineEventsLastEventTimeRequestSchema', () => {
  it('should correctly parse the last event time request object without unknown fields', () => {
    expect(timelineEventsLastEventTimeRequestSchema.parse(mockEventsLastEventTimeRequest)).toEqual(
      mockEventsLastEventTimeRequest
    );
  });

  it('should correctly parse the last event time request object and remove unknown fields', () => {
    const invalidEventsDetailsRequest = {
      ...mockEventsLastEventTimeRequest,
      unknownField: 'should-be-removed',
    };
    expect(timelineEventsLastEventTimeRequestSchema.parse(invalidEventsDetailsRequest)).toEqual(
      mockEventsLastEventTimeRequest
    );
  });

  it('should correctly error if an incorrect field type is provided for a schema key', () => {
    const invalidEventsDetailsRequest = {
      ...mockEventsLastEventTimeRequest,
      indexKey: 'unknown-key',
    };

    expect(() => {
      timelineEventsLastEventTimeRequestSchema.parse(invalidEventsDetailsRequest);
    }).toThrowErrorMatchingInlineSnapshot(`
      "[
        {
          \\"received\\": \\"unknown-key\\",
          \\"code\\": \\"invalid_enum_value\\",
          \\"options\\": [
            \\"hostDetails\\",
            \\"hosts\\",
            \\"users\\",
            \\"userDetails\\",
            \\"ipDetails\\",
            \\"network\\"
          ],
          \\"path\\": [
            \\"indexKey\\"
          ],
          \\"message\\": \\"Invalid enum value. Expected 'hostDetails' | 'hosts' | 'users' | 'userDetails' | 'ipDetails' | 'network', received 'unknown-key'\\"
        }
      ]"
    `);
  });
});
