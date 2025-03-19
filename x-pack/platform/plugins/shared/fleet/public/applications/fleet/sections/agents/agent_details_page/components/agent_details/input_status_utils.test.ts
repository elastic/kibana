/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FleetServerAgentComponent,
  FleetServerAgentComponentUnit,
} from '../../../../../../../../common/types/models/agent';

import { createPackagePolicyMock } from '../../../../../../../../common/mocks';

import { getInputUnitsByPackage } from './input_status_utils';

describe('getInputUnitsByPackage', () => {
  const agentComponents: FleetServerAgentComponent[] = [
    {
      id: 'log-default',
      type: 'log',
      status: 'HEALTHY',
      message: 'Healthy',
      units: [
        {
          id: 'log-default-logfile-system-df3a359d-9463-400c-8d8e-4d293ebf7821',
          type: 'input',
          message: 'Healthy',
          status: 'HEALTHY',
        },
        {
          id: 'log-default',
          type: 'output',
          message: 'Healthy',
          status: 'HEALTHY',
        },
        {
          id: 'log-default-logfile-apache-77fa4731-4502-4a44-bfbe-440b4662c08f',
          type: 'input',
          status: 'HEALTHY',
          message: 'Healthy',
        },
        {
          id: 'log-default-logfile-nginx-e513b2eb-1562-47b9-b0d1-51b294a6ea14',
          type: 'input',
          status: 'HEALTHY',
          message: 'Healthy',
        },
      ],
    },
    {
      id: 'system/metrics-default',
      type: 'system/metrics',
      status: 'HEALTHY',
      message: "Healthy: communicating with pid '2471'",
      units: [
        {
          id: 'system/metrics-default-system/metrics-system-df3a359d-9463-400c-8d8e-4d293ebf7821',
          type: 'input',
          status: 'HEALTHY',
          message: 'Healthy',
        },
        {
          id: 'system/metrics-default',
          type: 'output',
          status: 'HEALTHY',
          message: 'Healthy',
        },
      ],
    },
    {
      id: 'apache/metrics-default',
      type: 'apache/metrics',
      status: 'HEALTHY',
      message: "Healthy: communicating with pid '2493'",
      units: [
        {
          id: 'apache/metrics-default-apache/metrics-apache-77fa4731-4502-4a44-bfbe-440b4662c08f',
          type: 'input',
          status: 'HEALTHY',
          message: 'Healthy',
        },
        {
          id: 'apache/metrics-default',
          type: 'output',
          status: 'HEALTHY',
          message: 'Healthy',
        },
      ],
    },
    {
      id: 'nginx/metrics-default',
      type: 'nginx/metrics',
      status: 'HEALTHY',
      message: "Healthy: communicating with pid '2501'",
      units: [
        {
          id: 'nginx/metrics-default-nginx/metrics-nginx-e513b2eb-1562-47b9-b0d1-51b294a6ea14',
          type: 'input',
          status: 'HEALTHY',
          message: 'Healthy',
        },
        {
          id: 'nginx/metrics-default',
          type: 'output',
          status: 'HEALTHY',
          message: 'Healthy',
        },
      ],
    },
    {
      id: 'filestream-monitoring',
      type: 'filestream',
      status: 'HEALTHY',
      message: "Healthy: communicating with pid '2253'",
      units: [
        {
          id: 'filestream-monitoring',
          type: 'output',
          status: 'HEALTHY',
          message: 'Healthy',
        },
        {
          id: 'filestream-monitoring-filestream-monitoring-agent',
          type: 'input',
          status: 'HEALTHY',
          message: 'Healthy',
        },
      ],
    },
    {
      id: 'http/metrics-monitoring',
      type: 'http/metrics',
      status: 'HEALTHY',
      message: "Healthy: communicating with pid '2245'",
      units: [
        {
          id: 'http/metrics-monitoring',
          type: 'output',
          status: 'HEALTHY',
          message: 'Healthy',
        },
        {
          id: 'http/metrics-monitoring-metrics-monitoring-agent',
          type: 'input',
          status: 'HEALTHY',
          message: 'Healthy',
        },
      ],
    },
    {
      id: 'beat/metrics-monitoring',
      type: 'beat/metrics',
      status: 'HEALTHY',
      message: "Healthy: communicating with pid '2234'",
      units: [
        {
          id: 'beat/metrics-monitoring-metrics-monitoring-beats',
          type: 'input',
          status: 'HEALTHY',
          message: 'Healthy',
        },
        {
          id: 'beat/metrics-monitoring',
          type: 'output',
          status: 'HEALTHY',
          message: 'Healthy',
        },
      ],
    },
    // test a component with no units
    {
      id: 'beat/metrics-monitoring',
      type: 'beat/metrics',
      status: 'HEALTHY',
      message: "Healthy: communicating with pid '2234'",
    },
  ];

  const packageMock = createPackagePolicyMock();

  it('should return the agent component input units that belong to the package', () => {
    packageMock.id = 'df3a359d-9463-400c-8d8e-4d293ebf7821';
    expect(getInputUnitsByPackage(agentComponents, packageMock)).toEqual([
      {
        id: 'log-default-logfile-system-df3a359d-9463-400c-8d8e-4d293ebf7821',
        type: 'input',
        message: 'Healthy',
        status: 'HEALTHY',
      },
      {
        id: 'system/metrics-default-system/metrics-system-df3a359d-9463-400c-8d8e-4d293ebf7821',
        type: 'input',
        status: 'HEALTHY',
        message: 'Healthy',
      },
    ] as FleetServerAgentComponentUnit[]);
  });

  packageMock.id = '77fa4731-4502-4a44-bfbe-440b4662c08f';
  expect(getInputUnitsByPackage(agentComponents, packageMock)).toEqual([
    {
      id: 'log-default-logfile-apache-77fa4731-4502-4a44-bfbe-440b4662c08f',
      type: 'input',
      status: 'HEALTHY',
      message: 'Healthy',
    },
    {
      id: 'apache/metrics-default-apache/metrics-apache-77fa4731-4502-4a44-bfbe-440b4662c08f',
      type: 'input',
      status: 'HEALTHY',
      message: 'Healthy',
    },
  ] as FleetServerAgentComponentUnit[]);
});
