/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleResponse } from '../get_beats_for_clusters';
import expect from '@kbn/expect';

describe('get_beats_for_clusters', () => {
  it('Handles empty aggregation', () => {
    const clusterUuid = 'foo_uuid';
    const response = {
    };
    expect(handleResponse(clusterUuid, response)).to.eql({
      clusterUuid: 'foo_uuid',
      stats: {
        totalEvents: null,
        bytesSent: null,
        beats: {
          total: null,
          types: [],
        }
      }
    });
  });

  it('Combines stats', () => {
    const clusterUuid = 'foo_uuid';
    const response = {
      aggregations: {
        total: {
          value: 1400
        },
        types: {
          buckets: [
            { key: 'filebeat', uuids: { buckets: new Array(1000) } },
            { key: 'metricbeat', uuids: { buckets: new Array(1200) } },
          ]
        },
        min_events_total: { value: 83472836 },
        max_events_total: { value: 89972836 },
        min_bytes_sent_total: { value: 293476 },
        max_bytes_sent_total: { value: 333476 },
      }
    };
    expect(handleResponse(clusterUuid, response)).to.eql({
      clusterUuid: 'foo_uuid',
      stats: {
        totalEvents: 6500000,
        bytesSent: 40000,
        beats: {
          total: 1400,
          types: [
            {
              count: 1000,
              type: 'Filebeat',
            },
            {
              count: 1200,
              type: 'Metricbeat',
            }
          ],
        }
      }
    });
  });
});
