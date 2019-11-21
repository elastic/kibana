/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getApmHref } from '../get_apm_href';
import { MonitorSummary } from '../../../../../common/graphql/types';

describe('getApmHref', () => {
  let summary: MonitorSummary;

  beforeEach(() => {
    summary = {
      monitor_id: 'foo',
      state: {
        summary: {},
        checks: [
          {
            monitor: {
              ip: '151.101.202.217',
              status: 'up',
            },
            container: {
              id: 'test-container-id',
            },
            kubernetes: {
              pod: {
                uid: 'test-pod-id',
              },
            },
            timestamp: '123',
          },
        ],
        timestamp: '123',
        url: {
          full: 'https://www.elastic.co/',
          domain: 'www.elastic.co',
        },
      },
    };
  });

  it('creates href with base path when present', () => {
    const result = getApmHref(summary, 'foo', 'now-15m', 'now');
    expect(result).toMatchSnapshot();
  });

  it('does not add a base path or extra slash when base path is empty string', () => {
    const result = getApmHref(summary, '', 'now-15m', 'now');
    expect(result).toMatchSnapshot();
  });
});
