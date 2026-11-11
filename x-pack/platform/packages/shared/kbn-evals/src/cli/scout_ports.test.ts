/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Net from 'net';
import { findPortsInUse } from './scout_ports';

describe('findPortsInUse', () => {
  let server: Net.Server;
  let busyPort: number;

  beforeEach(async () => {
    server = Net.createServer();
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    busyPort = (server.address() as Net.AddressInfo).port;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('reports ports another process listens on and leaves free ports out', async () => {
    const freeServer = Net.createServer();
    await new Promise<void>((resolve) => freeServer.listen(0, '127.0.0.1', resolve));
    const freePort = (freeServer.address() as Net.AddressInfo).port;
    await new Promise<void>((resolve) => freeServer.close(() => resolve()));

    expect(await findPortsInUse([busyPort, freePort])).toEqual([busyPort]);
  });
});
