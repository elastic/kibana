/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';

export const demoEndpointLibraryLoadEvent: Ecs = {
  file: {
    path: ['C:\\Windows\\System32\\bcrypt.dll'],
    hash: {
      md5: ['00439016776de367bad087d739a03797'],
      sha1: ['2c4ba5c1482987d50a182bad915f52cd6611ee63'],
      sha256: ['e70f5d8f87aab14e3160227d38387889befbe37fa4f8f5adc59eff52804b35fd'],
    },
    name: ['bcrypt.dll'],
  },
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
    category: ['library'],
    kind: ['event'],
    created: ['2021-02-05T21:27:23.921Z'],
    module: ['endpoint'],
    action: ['load'],
    type: ['start'],
    id: ['LzzWB9jjGmCwGMvk++++Da5H'],
    dataset: ['endpoint.events.library'],
  },
  process: {
    name: ['sshd.exe'],
    pid: [9644],
    entity_id: [
      'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTk2NDQtMTMyNTcwMzQwNDEuNzgyMTczODAw',
    ],
    executable: ['C:\\Program Files\\OpenSSH-Win64\\sshd.exe'],
  },
  agent: {
    type: ['endpoint'],
  },
  user: {
    name: ['SYSTEM'],
    domain: ['NT AUTHORITY'],
  },
  message: ['Endpoint DLL load event'],
  timestamp: '2021-02-05T21:27:23.921Z',
  _id: 'IAUYdHcBGrBB52F2zo8Q',
};
