/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RecentAutoFollowError } from '../../../common/types';
import { parseAutoFollowErrors } from './auto_follow_errors';

describe('Auto-follow pattern errors service', () => {
  it('should convert an array of error to an object where each key is an auto-follow pattern id', () => {
    const esErrors: RecentAutoFollowError[] = [
      {
        timestamp: 1,
        leaderIndex: 'some:id::kibana_sample_4',
        autoFollowException: { type: 'exception', reason: 'Error 1' },
      },
      {
        timestamp: 2,
        leaderIndex: 'another-id:mock:kibana_sample_5',
        autoFollowException: { type: 'exception', reason: 'Error 2' },
      },
      {
        timestamp: 3,
        leaderIndex: 'some:id::kibana_sample_5',
        autoFollowException: { type: 'exception', reason: 'Error 3' },
      },
    ];

    const expected = {
      'another-id:mock': [
        {
          id: 'another-id:mock',
          timestamp: 2,
          leaderIndex: 'another-id:mock:kibana_sample_5',
          autoFollowException: { type: 'exception', reason: 'Error 2' },
        },
      ],
      'some:id:': [
        {
          id: 'some:id:',
          timestamp: 1,
          leaderIndex: 'some:id::kibana_sample_4',
          autoFollowException: { type: 'exception', reason: 'Error 1' },
        },
        {
          id: 'some:id:',
          timestamp: 3,
          leaderIndex: 'some:id::kibana_sample_5',
          autoFollowException: { type: 'exception', reason: 'Error 3' },
        },
      ],
    };

    expect(parseAutoFollowErrors(esErrors)).toEqual(expected);
  });

  it('should limit the number of error to show for each pattern', () => {
    const esErrors: RecentAutoFollowError[] = [
      {
        timestamp: 1,
        leaderIndex: 'my-id:kibana-1',
        autoFollowException: { type: 'exception', reason: 'e' },
      },
      {
        timestamp: 2,
        leaderIndex: 'my-id:kibana-2',
        autoFollowException: { type: 'exception', reason: 'e' },
      },
      {
        timestamp: 3,
        leaderIndex: 'my-id:kibana-3',
        autoFollowException: { type: 'exception', reason: 'e' },
      },
      {
        timestamp: 4,
        leaderIndex: 'my-id:kibana-4',
        autoFollowException: { type: 'exception', reason: 'e' },
      },
      {
        timestamp: 5,
        leaderIndex: 'my-id:kibana-5',
        autoFollowException: { type: 'exception', reason: 'e' },
      },
      {
        timestamp: 6,
        leaderIndex: 'my-id:kibana-6',
        autoFollowException: { type: 'exception', reason: 'e' },
      },
      {
        timestamp: 7,
        leaderIndex: 'my-id:kibana-7',
        autoFollowException: { type: 'exception', reason: 'e' },
      },
    ];

    expect(parseAutoFollowErrors(esErrors)['my-id'].length).toEqual(5);
  });
});
