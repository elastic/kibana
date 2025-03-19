/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  checkFleetServerVersion,
  getFleetServerVersionMessage,
  isAgentVersionLessThanFleetServer,
} from './check_fleet_server_versions';

describe('checkFleetServerVersion', () => {
  it('should not throw if no force is specified and patch is newer', () => {
    const fleetServers = [
      { local_metadata: { elastic: { agent: { version: '8.3.0' } } } },
      { local_metadata: { elastic: { agent: { version: '8.4.0' } } } },
    ] as any;
    expect(() => checkFleetServerVersion('8.4.1', fleetServers, false)).not.toThrowError();
    expect(() => checkFleetServerVersion('8.4.1-SNAPSHOT', fleetServers, false)).not.toThrowError();
  });

  it('should throw if no force is specified and minor is newer', () => {
    const fleetServers = [
      { local_metadata: { elastic: { agent: { version: '8.3.0' } } } },
      { local_metadata: { elastic: { agent: { version: '8.4.0' } } } },
    ] as any;
    expect(() => checkFleetServerVersion('8.5.1', fleetServers, false)).toThrowError(
      'Cannot upgrade to version 8.5.1 because it is higher than the latest fleet server version 8.4.0.'
    );
  });

  it('should throw if force is specified and patch should not be considered', () => {
    const fleetServers = [
      { local_metadata: { elastic: { agent: { version: '8.3.0' } } } },
      { local_metadata: { elastic: { agent: { version: '8.4.0' } } } },
    ] as any;
    expect(() => checkFleetServerVersion('8.5.1', fleetServers, true)).toThrowError(
      'Cannot force upgrade to version 8.5.1 because it does not satisfy the major and minor of the latest fleet server version 8.4.0.'
    );
  });

  it('should not throw in serverless if there is not in fleetServers', () => {
    const fleetServers = [] as any;
    expect(() => checkFleetServerVersion('8.5.1', fleetServers, true)).not.toThrow();
  });
});

describe('isAgentVersionLessThanFleetServer', () => {
  it('should return true if there is no fleet server (serverless)', () => {
    expect(isAgentVersionLessThanFleetServer('8.12.0', [])).toBe(true);
  });

  it('should return true if version is less than fleet server ', () => {
    const fleetServers = [
      { local_metadata: { elastic: { agent: { version: '8.3.0' } } } },
      { local_metadata: { elastic: { agent: { version: '8.4.0' } } } },
    ] as any;
    expect(isAgentVersionLessThanFleetServer('8.3.0', fleetServers)).toBe(true);
  });

  it('should return false if version is more than fleet server ', () => {
    const fleetServers = [
      { local_metadata: { elastic: { agent: { version: '8.3.0' } } } },
      { local_metadata: { elastic: { agent: { version: '8.4.0' } } } },
    ] as any;
    expect(isAgentVersionLessThanFleetServer('8.5.0', fleetServers)).toBe(false);
  });

  it('should not throw if version is not a semver', () => {
    const fleetServers = [
      { local_metadata: { elastic: { agent: { version: '8.13.0' } } } },
      { local_metadata: { elastic: { agent: { version: '8.14.0' } } } },
    ] as any;
    const version = '8.14';

    const result = isAgentVersionLessThanFleetServer(version, fleetServers);

    expect(result).toEqual(false);
  });
});

describe('getFleetServerVersionMessage', () => {
  it('should not throw if version is not a semver', () => {
    const fleetServers = [
      { local_metadata: { elastic: { agent: { version: '8.13.0' } } } },
      { local_metadata: { elastic: { agent: { version: '8.14.0' } } } },
    ] as any;
    const version = '8.14';

    const result = getFleetServerVersionMessage(version, fleetServers);

    expect(result).toEqual('Invalid Version: 8.14');
  });
});
