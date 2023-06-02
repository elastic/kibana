/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';

export const demoEndpointRegistryModificationEvent: Ecs = {
  host: {
    os: {
      full: ['Windows Server 2019 Datacenter 1809 (10.0.17763.1697)'],
      name: ['Windows'],
      version: ['1809 (10.0.17763.1697)'],
      family: ['windows'],
      kernel: ['1809 (10.0.17763.1697)'],
      platform: ['windows'],
    },
    mac: ['aa:bb:cc:dd:ee:ff'],
    name: ['win2019-endpoint-1'],
    architecture: ['x86_64'],
    ip: ['10.1.2.3'],
    id: ['d8ad572e-d224-4044-a57d-f5a84c0dfe5d'],
  },
  event: {
    category: ['registry'],
    kind: ['event'],
    created: ['2021-02-04T13:44:31.559Z'],
    module: ['endpoint'],
    action: ['modification'],
    type: ['change'],
    id: ['LzzWB9jjGmCwGMvk++++CbOn'],
    dataset: ['endpoint.events.registry'],
  },
  process: {
    name: ['GoogleUpdate.exe'],
    pid: [7408],
    entity_id: [
      'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTc0MDgtMTMyNTY5MTk4NDguODY4NTI0ODAw',
    ],
    executable: ['C:\\Program Files (x86)\\Google\\Update\\GoogleUpdate.exe'],
  },
  registry: {
    hive: ['HKLM'],
    key: [
      'SOFTWARE\\WOW6432Node\\Google\\Update\\ClientState\\{430FD4D0-B729-4F61-AA34-91526481799D}\\CurrentState',
    ],
    path: [
      'HKLM\\SOFTWARE\\WOW6432Node\\Google\\Update\\ClientState\\{430FD4D0-B729-4F61-AA34-91526481799D}\\CurrentState\\StateValue',
    ],
    value: ['StateValue'],
  },
  agent: {
    type: ['endpoint'],
  },
  user: {
    name: ['SYSTEM'],
    domain: ['NT AUTHORITY'],
  },
  message: ['Endpoint registry event'],
  timestamp: '2021-02-04T13:44:31.559Z',
  _id: '4cxLbXcBGrBB52F2uOfF',
};
