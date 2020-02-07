/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getInfraContainerHref, getInfraKubernetesHref, getInfraIpHref } from '../get_infra_href';
import { MonitorSummary } from '../../../../../common/graphql/types';

describe('getInfraHref', () => {
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

  it('getInfraContainerHref creates a link for valid parameters', () => {
    const result = getInfraContainerHref(summary, 'foo');
    expect(result).toMatchSnapshot();
  });

  it('getInfraContainerHref does not specify a base path when none is available', () => {
    expect(getInfraContainerHref(summary, '')).toMatchSnapshot();
  });

  it('getInfraContainerHref returns undefined when no container id is present', () => {
    summary.state.checks = [];
    expect(getInfraContainerHref(summary, 'foo')).toBeUndefined();
  });

  it('getInfraContainerHref returns the first item when multiple container ids are supplied', () => {
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
    expect(getInfraContainerHref(summary, 'bar')).toMatchSnapshot();
  });

  it('getInfraContainerHref returns undefined when checks are undefined', () => {
    delete summary.state.checks;
    expect(getInfraContainerHref(summary, '')).toBeUndefined();
  });

  it('getInfraKubernetesHref creates a link for valid parameters', () => {
    const result = getInfraKubernetesHref(summary, 'foo');
    expect(result).not.toBeUndefined();
    expect(result).toMatchSnapshot();
  });

  it('getInfraKubernetesHref does not specify a base path when none is available', () => {
    expect(getInfraKubernetesHref(summary, '')).toMatchSnapshot();
  });

  it('getInfraKubernetesHref returns undefined when no pod data is present', () => {
    summary.state.checks = [];
    expect(getInfraKubernetesHref(summary, 'foo')).toBeUndefined();
  });

  it('getInfraKubernetesHref selects the first pod uid when there are multiple', () => {
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
    expect(getInfraKubernetesHref(summary, '')).toMatchSnapshot();
  });

  it('getInfraKubernetesHref returns undefined when checks are undefined', () => {
    delete summary.state.checks;
    expect(getInfraKubernetesHref(summary, '')).toBeUndefined();
  });

  it('getInfraKubernetesHref returns undefined when checks are null', () => {
    summary.state.checks![0]!.kubernetes!.pod!.uid = null;
    expect(getInfraKubernetesHref(summary, '')).toBeUndefined();
  });

  it('getInfraIpHref creates a link for valid parameters', () => {
    const result = getInfraIpHref(summary, 'bar');
    expect(result).toMatchSnapshot();
  });

  it('getInfraIpHref does not specify a base path when none is available', () => {
    expect(getInfraIpHref(summary, '')).toMatchSnapshot();
  });

  it('getInfraIpHref returns undefined when ip is undefined', () => {
    summary.state.checks = [];
    expect(getInfraIpHref(summary, 'foo')).toBeUndefined();
  });

  it('getInfraIpHref returns undefined when ip is null', () => {
    summary.state.checks![0].monitor.ip = null;
    expect(getInfraIpHref(summary, 'foo')).toBeUndefined();
  });

  it('getInfraIpHref returns a url for ors between multiple ips', () => {
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
    expect(getInfraIpHref(summary, 'foo')).toMatchSnapshot();
  });

  it('getInfraIpHref returns undefined if checks are undefined', () => {
    delete summary.state.checks;
    expect(getInfraIpHref(summary, 'foo')).toBeUndefined();
  });
});
