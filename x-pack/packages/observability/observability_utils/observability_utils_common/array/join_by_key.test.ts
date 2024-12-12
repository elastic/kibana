/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { joinByKey } from './join_by_key';

describe('joinByKey', () => {
  it('joins by a string key', () => {
    const joined = joinByKey(
      [
        {
          serviceName: 'opbeans-node',
          avg: 10,
        },
        {
          serviceName: 'opbeans-node',
          count: 12,
        },
        {
          serviceName: 'opbeans-java',
          avg: 11,
        },
        {
          serviceName: 'opbeans-java',
          p95: 18,
        },
      ],
      'serviceName'
    );

    expect(joined.length).toBe(2);

    expect(joined).toEqual([
      {
        serviceName: 'opbeans-node',
        avg: 10,
        count: 12,
      },
      {
        serviceName: 'opbeans-java',
        avg: 11,
        p95: 18,
      },
    ]);
  });

  it('joins by a record key', () => {
    const joined = joinByKey(
      [
        {
          key: {
            serviceName: 'opbeans-node',
            transactionName: '/api/opbeans-node',
          },
          avg: 10,
        },
        {
          key: {
            serviceName: 'opbeans-node',
            transactionName: '/api/opbeans-node',
          },
          count: 12,
        },
        {
          key: {
            serviceName: 'opbeans-java',
            transactionName: '/api/opbeans-java',
          },
          avg: 11,
        },
        {
          key: {
            serviceName: 'opbeans-java',
            transactionName: '/api/opbeans-java',
          },
          p95: 18,
        },
      ],
      'key'
    );

    expect(joined.length).toBe(2);

    expect(joined).toEqual([
      {
        key: {
          serviceName: 'opbeans-node',
          transactionName: '/api/opbeans-node',
        },
        avg: 10,
        count: 12,
      },
      {
        key: {
          serviceName: 'opbeans-java',
          transactionName: '/api/opbeans-java',
        },
        avg: 11,
        p95: 18,
      },
    ]);
  });

  it('joins by multiple keys', () => {
    const data = [
      {
        serviceName: 'opbeans-node',
        environment: 'production',
        type: 'service',
      },
      {
        serviceName: 'opbeans-node',
        environment: 'stage',
        type: 'service',
      },
      {
        serviceName: 'opbeans-node',
        hostName: 'host-1',
      },
      {
        containerId: 'containerId',
      },
    ];

    const alerts = [
      {
        serviceName: 'opbeans-node',
        environment: 'production',
        type: 'service',
        alertCount: 10,
      },
      {
        containerId: 'containerId',
        alertCount: 1,
      },
      {
        hostName: 'host-1',
        environment: 'production',
        alertCount: 5,
      },
    ];

    const joined = joinByKey(
      [...data, ...alerts],
      ['serviceName', 'environment', 'hostName', 'containerId']
    );

    expect(joined.length).toBe(5);

    expect(joined).toEqual([
      { environment: 'stage', serviceName: 'opbeans-node', type: 'service' },
      { hostName: 'host-1', serviceName: 'opbeans-node' },
      { alertCount: 10, environment: 'production', serviceName: 'opbeans-node', type: 'service' },
      { alertCount: 1, containerId: 'containerId' },
      { alertCount: 5, environment: 'production', hostName: 'host-1' },
    ]);
  });

  it('uses the custom merge fn to replace items', () => {
    const joined = joinByKey(
      [
        {
          serviceName: 'opbeans-java',
          values: ['a'],
        },
        {
          serviceName: 'opbeans-node',
          values: ['a'],
        },
        {
          serviceName: 'opbeans-node',
          values: ['b'],
        },
        {
          serviceName: 'opbeans-node',
          values: ['c'],
        },
      ],
      'serviceName',
      (a, b) => ({
        ...a,
        ...b,
        values: a.values.concat(b.values),
      })
    );

    expect(joined.find((item) => item.serviceName === 'opbeans-node')?.values).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('deeply merges objects', () => {
    const joined = joinByKey(
      [
        {
          serviceName: 'opbeans-node',
          properties: {
            foo: '',
          },
        },
        {
          serviceName: 'opbeans-node',
          properties: {
            bar: '',
          },
        },
      ],
      'serviceName'
    );

    expect(joined[0]).toEqual({
      serviceName: 'opbeans-node',
      properties: {
        foo: '',
        bar: '',
      },
    });
  });

  it('deeply merges by unflatten keys', () => {
    const joined = joinByKey(
      [
        {
          service: {
            name: 'opbeans-node',
            metrics: {
              cpu: 0.1,
            },
          },
          properties: {
            foo: 'bar',
          },
        },
        {
          service: {
            environment: 'prod',
            metrics: {
              memory: 0.5,
            },
          },
          properties: {
            foo: 'bar',
          },
        },
      ],
      'properties.foo'
    );

    expect(joined).toEqual([
      {
        service: {
          name: 'opbeans-node',
          environment: 'prod',
          metrics: {
            cpu: 0.1,
            memory: 0.5,
          },
        },
        properties: {
          foo: 'bar',
        },
      },
    ]);
  });
});
