/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleLastRecoveries, filterOldShardActivity } from '../get_last_recovery';
import expect from '@kbn/expect';

describe('get_last_recovery', () => {
  // Note: times are from the epoch!
  const resp = {
    hits: {
      hits: [
        {
          _source: {
            index_recovery: {
              // The order of these is unpredictable.
              shards: [
                {
                  start_time_in_millis: 50,
                  stop_time_in_millis: 300
                },
                {
                  start_time_in_millis: 10,
                  stop_time_in_millis: 100
                },
                {
                  start_time_in_millis: 100,
                  stop_time_in_millis: 500
                },
                {
                  start_time_in_millis: 30,
                  stop_time_in_millis: 300
                },
                {
                  start_time_in_millis: 0,
                  stop_time_in_millis: 100
                }
              ]
            }
          }
        }
      ]
    }
  };

  it('No hits results in an empty array', () => {
    // Note: we don't expect it to touch hits without total === 1
    expect(handleLastRecoveries({ hits: { hits: [] } }, new Date(0))).to.have.length(0);
  });

  it('Filters on stop time', () => {
    expect(handleLastRecoveries(resp, new Date(0))).to.have.length(5);
    expect(handleLastRecoveries(resp, new Date(99))).to.have.length(5);
    expect(handleLastRecoveries(resp, new Date(100))).to.have.length(5);
    expect(handleLastRecoveries(resp, new Date(101))).to.have.length(3);
    expect(handleLastRecoveries(resp, new Date(501))).to.have.length(0);

    const filteredActivities = handleLastRecoveries(resp, new Date(301));

    expect(filteredActivities).to.have.length(1);
    expect(filteredActivities[0].stop_time_in_millis).to.be.equal(500);
  });

  it('Sorts based on start time (descending)', () => {
    const sortedActivities = handleLastRecoveries(resp, new Date(0));

    expect(sortedActivities[0].start_time_in_millis).to.be.equal(100);
    expect(sortedActivities[4].start_time_in_millis).to.be.equal(0);
  });

  it('Filters only on stop time', () => {
    const filter = filterOldShardActivity(10);

    expect(filter({})).to.be(true);
    expect(filter({ stop_time_in_millis: null })).to.be(true);
    expect(filter({ stop_time_in_millis: 100 })).to.be(true);
    expect(filter({ stop_time_in_millis: 10 })).to.be(true);
    expect(filter({ stop_time_in_millis: 9 })).to.be(false);
    expect(filter({ stop_time_in_millis: 0 })).to.be(false);
    // nonsense in terms of value order, but ensures that start_time isn't considered
    expect(filter({ start_time_in_millis: 50, stop_time_in_millis: 0 })).to.be(false);
  });
});
