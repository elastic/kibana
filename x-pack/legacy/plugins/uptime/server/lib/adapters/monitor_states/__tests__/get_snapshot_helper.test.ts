/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSnapshotCountHelper } from '../get_snapshot_helper';
import { MonitorGroups } from '../search';

describe('get snapshot helper', () => {
  let mockIterator: any;
  beforeAll(() => {
    mockIterator = jest.fn();
    const summaryTimestamp = new Date('2019-01-01');
    const firstResult: MonitorGroups = {
      id: 'firstGroup',
      groups: [
        {
          monitorId: 'first-monitor',
          location: 'us-east-1',
          checkGroup: 'abc',
          status: 'down',
          summaryTimestamp,
        },
        {
          monitorId: 'first-monitor',
          location: 'us-west-1',
          checkGroup: 'abc',
          status: 'up',
          summaryTimestamp,
        },
        {
          monitorId: 'first-monitor',
          location: 'amsterdam',
          checkGroup: 'abc',
          status: 'down',
          summaryTimestamp,
        },
      ],
    };
    const secondResult: MonitorGroups = {
      id: 'secondGroup',
      groups: [
        {
          monitorId: 'second-monitor',
          location: 'us-east-1',
          checkGroup: 'yyz',
          status: 'up',
          summaryTimestamp,
        },
        {
          monitorId: 'second-monitor',
          location: 'us-west-1',
          checkGroup: 'yyz',
          status: 'up',
          summaryTimestamp,
        },
        {
          monitorId: 'second-monitor',
          location: 'amsterdam',
          checkGroup: 'yyz',
          status: 'up',
          summaryTimestamp,
        },
      ],
    };
    const thirdResult: MonitorGroups = {
      id: 'thirdGroup',
      groups: [
        {
          monitorId: 'third-monitor',
          location: 'us-east-1',
          checkGroup: 'dt',
          status: 'up',
          summaryTimestamp,
        },
        {
          monitorId: 'third-monitor',
          location: 'us-west-1',
          checkGroup: 'dt',
          status: 'up',
          summaryTimestamp,
        },
        {
          monitorId: 'third-monitor',
          location: 'amsterdam',
          checkGroup: 'dt',
          status: 'up',
          summaryTimestamp,
        },
      ],
    };

    const mockNext = jest
      .fn()
      .mockReturnValueOnce(firstResult)
      .mockReturnValueOnce(secondResult)
      .mockReturnValueOnce(thirdResult)
      .mockReturnValueOnce(null);
    mockIterator.next = mockNext;
  });

  it('reduces check groups as expected', async () => {
    expect(await getSnapshotCountHelper(mockIterator)).toMatchSnapshot();
  });
});
