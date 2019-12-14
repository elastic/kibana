/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleResponse } from '../get_stats';
import expect from '@kbn/expect';

describe('beats/get_stats', () => {
  it('Handle empty response', () => {
    expect(handleResponse()).to.eql({
      stats: {
        bytesSent: null,
        totalEvents: null,
      },
      total: null,
      types: [],
    });
  });

  it('Summarizes response data', () => {
    const response = {
      aggregations: {
        total: { value: 2200 },
        types: {
          buckets: [
            { key: 'filebeat', uuids: { buckets: new Array(1000) } },
            { key: 'metricbeat', uuids: { buckets: new Array(1200) } },
          ],
        },
        min_events_total: { value: 83472836 },
        max_events_total: { value: 89972836 },
        min_bytes_sent_total: { value: 293476 },
        max_bytes_sent_total: { value: 333476 },
      },
    };

    expect(handleResponse(response)).to.eql({
      stats: {
        bytesSent: 40000,
        totalEvents: 6500000,
      },
      total: 2200,
      types: [{ type: 'Filebeat', count: 1000 }, { type: 'Metricbeat', count: 1200 }],
    });
  });

  it('Summarizes response data with nulls (N/A) if beat restarted', () => {
    const response = {
      aggregations: {
        total: { value: 2200 },
        types: {
          buckets: [
            { key: 'filebeat', uuids: { buckets: new Array(1000) } },
            { key: 'metricbeat', uuids: { buckets: new Array(1200) } },
          ],
        },
        min_events_total: { value: 89972836 },
        max_events_total: { value: 662836 },
        min_bytes_sent_total: { value: 293476 },
        max_bytes_sent_total: { value: 88476 },
      },
    };

    expect(handleResponse(response)).to.eql({
      stats: {
        bytesSent: null,
        totalEvents: null,
      },
      total: 2200,
      types: [{ type: 'Filebeat', count: 1000 }, { type: 'Metricbeat', count: 1200 }],
    });
  });
});
