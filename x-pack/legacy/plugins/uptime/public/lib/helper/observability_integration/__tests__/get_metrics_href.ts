/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getMetricsContainerHref,
  getMetricsKubernetesHref,
  getMetricsIpHref,
} from '../get_metrics_href';
import { MonitorSummary } from '../../../../../common/graphql/types';

describe('getMetricsHref', () => {
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
                uid: 'test-pod-uid',
              },
            },
            timestamp: '123',
          },
        ],
        timestamp: '123',
      },
    };
  });

  it('getMetricsContainerHref creates a link for valid parameters', () => {
    const result = getMetricsContainerHref(summary, 'foo');
    expect(result).toMatchSnapshot();
  });

  it('getMetricsContainerHref does not specify a base path when none is available', () => {
    expect(getMetricsContainerHref(summary, '')).toMatchSnapshot();
  });

  it('getMetricsContainerHref returns undefined when no container id is present', () => {
    summary.state.checks = [];
    expect(getMetricsContainerHref(summary, 'foo')).toBeUndefined();
  });

  it('getMetricsContainerHref returns the first item when multiple container ids are supplied', () => {
    summary.state.checks = [
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
            uid: 'test-pod-uid',
          },
        },
        timestamp: '123',
      },
      {
        monitor: {
          ip: '151.101.202.27',
          status: 'up',
        },
        container: {
          id: 'test-container-id-foo',
        },
        kubernetes: {
          pod: {
            uid: 'test-pod-uid-bar',
          },
        },
        timestamp: '123',
      },
    ];
    expect(getMetricsContainerHref(summary, 'bar')).toMatchSnapshot();
  });

  it('getMetricsContainerHref returns undefined when checks are undefined', () => {
    delete summary.state.checks;
    expect(getMetricsContainerHref(summary, '')).toBeUndefined();
  });

  it('getMetricsKubernetesHref creates a link for valid parameters', () => {
    const result = getMetricsKubernetesHref(summary, 'foo');
    expect(result).not.toBeUndefined();
    expect(result).toMatchSnapshot();
  });

  it('getMetricsKubernetesHref does not specify a base path when none is available', () => {
    expect(getMetricsKubernetesHref(summary, '')).toMatchSnapshot();
  });

  it('getMetricsKubernetesHref returns undefined when no pod data is present', () => {
    summary.state.checks = [];
    expect(getMetricsKubernetesHref(summary, 'foo')).toBeUndefined();
  });

  it('getMetricsKubernetesHref selects the first pod uid when there are multiple', () => {
    summary.state.checks = [
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
            uid: 'test-pod-uid',
          },
        },
        timestamp: '123',
      },
      {
        monitor: {
          ip: '151.101.202.27',
          status: 'up',
        },
        container: {
          id: 'test-container-id-foo',
        },
        kubernetes: {
          pod: {
            uid: 'test-pod-uid-bar',
          },
        },
        timestamp: '123',
      },
    ];
    expect(getMetricsKubernetesHref(summary, '')).toMatchSnapshot();
  });

  it('getMetricsKubernetesHref returns undefined when checks are undefined', () => {
    delete summary.state.checks;
    expect(getMetricsKubernetesHref(summary, '')).toBeUndefined();
  });

  it('getMetricsKubernetesHref returns undefined when checks are null', () => {
    summary.state.checks![0]!.kubernetes!.pod!.uid = null;
    expect(getMetricsKubernetesHref(summary, '')).toBeUndefined();
  });

  it('getMetricsIpHref creates a link for valid parameters', () => {
    const result = getMetricsIpHref(summary, 'bar');
    expect(result).toMatchSnapshot();
  });

  it('getMetricsIpHref does not specify a base path when none is available', () => {
    expect(getMetricsIpHref(summary, '')).toMatchSnapshot();
  });

  it('getMetricsIpHref returns undefined when ip is undefined', () => {
    summary.state.checks = [];
    expect(getMetricsIpHref(summary, 'foo')).toBeUndefined();
  });

  it('getMetricsIpHref returns undefined when ip is null', () => {
    summary.state.checks![0].monitor.ip = null;
    expect(getMetricsIpHref(summary, 'foo')).toBeUndefined();
  });

  it('getMetricsIpHref returns a url for ors between multiple ips', () => {
    summary.state.checks = [
      {
        timestamp: '123',
        monitor: {
          ip: '152.151.23.192',
          status: 'up',
        },
      },
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
            uid: 'test-pod-uid',
          },
        },
        timestamp: '123',
      },
    ];
    expect(getMetricsIpHref(summary, 'foo')).toMatchSnapshot();
  });

  it('getMetricsIpHref returns undefined if checks are undefined', () => {
    delete summary.state.checks;
    expect(getMetricsIpHref(summary, 'foo')).toBeUndefined();
  });
});
