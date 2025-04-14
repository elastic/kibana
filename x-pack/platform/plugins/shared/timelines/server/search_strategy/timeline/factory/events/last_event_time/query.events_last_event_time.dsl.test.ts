/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimelineEventsQueries } from '../../../../../../common/api/search_strategy';
import { LastEventIndexKey } from '../../../../../../common/api/search_strategy/timeline/events_last_event_time';
import { buildLastEventTimeQuery } from './query.events_last_event_time.dsl';

describe('buildLastEventTimeQuery', () => {
  it('should return ip details query if index key is ipDetails', () => {
    const defaultIndex = ['.siem-signals-default'];
    const query = buildLastEventTimeQuery({
      indexKey: LastEventIndexKey.ipDetails,
      details: { ip: '12345567' },
      defaultIndex,
      factoryQueryType: TimelineEventsQueries.lastEventTime,
    });
    expect(query).toMatchInlineSnapshot(`
      Object {
        "allow_no_indices": true,
        "body": Object {
          "_source": false,
          "fields": Array [
            Object {
              "field": "@timestamp",
              "format": "strict_date_optional_time",
            },
          ],
          "query": Object {
            "bool": Object {
              "filter": Object {
                "bool": Object {
                  "should": Array [
                    Object {
                      "term": Object {
                        "source.ip": "12345567",
                      },
                    },
                    Object {
                      "term": Object {
                        "destination.ip": "12345567",
                      },
                    },
                  ],
                },
              },
            },
          },
          "size": 1,
          "sort": Array [
            Object {
              "@timestamp": Object {
                "order": "desc",
              },
            },
          ],
        },
        "ignore_unavailable": true,
        "index": Array [
          ".siem-signals-default",
        ],
        "track_total_hits": false,
      }
    `);
  });
});
