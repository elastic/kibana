/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { AuthServiceContract } from './auth_service';
import { createAuthServiceMock } from './auth_service.mock';
import { UNRESTRICTED, withAuthorization, type AuthPolicies } from './method_authorization';

class FakeClient {
  public readonly label = 'fake';
  public readonly calls: string[] = [];

  public async write(value: string): Promise<string> {
    this.calls.push(`write:${value}`);
    return `wrote ${value}`;
  }

  public async read(): Promise<string> {
    this.calls.push('read');
    return 'read';
  }

  public async writeThenRead(value: string): Promise<string> {
    await this.write(value);
    return this.read();
  }

  public async open(): Promise<string> {
    return this.helper();
  }

  private helper(): string {
    return 'open';
  }
}

const policies: AuthPolicies<FakeClient> = {
  write: { feature: 'alerts', operation: 'write' },
  read: { feature: 'alerts', operation: 'read' },
  writeThenRead: (value) =>
    value === 'rules'
      ? { feature: 'rules', operation: 'write' }
      : { feature: 'alerts', operation: 'write' },
  open: UNRESTRICTED,
};

describe('withAuthorization', () => {
  let target: FakeClient;
  let authService: jest.Mocked<AuthServiceContract>;
  let client: FakeClient;

  beforeEach(() => {
    target = new FakeClient();
    authService = createAuthServiceMock();
    client = withAuthorization(target, authService, policies);
  });

  it('authorizes a static policy before invoking the method', async () => {
    await expect(client.write('x')).resolves.toBe('wrote x');

    expect(authService.ensureAuthorized).toHaveBeenCalledWith({
      feature: 'alerts',
      operation: 'write',
    });
    expect(target.calls).toEqual(['write:x']);
  });

  it('does not invoke the method when authorization is denied', async () => {
    authService.ensureAuthorized.mockRejectedValueOnce(Boom.forbidden('nope'));

    await expect(client.write('x')).rejects.toMatchObject({ output: { statusCode: 403 } });
    expect(target.calls).toEqual([]);
  });

  it('derives the requirement from the call arguments for a function policy', async () => {
    await client.writeThenRead('rules');

    expect(authService.ensureAuthorized).toHaveBeenCalledWith({
      feature: 'rules',
      operation: 'write',
    });
  });

  it('authorizes once at the entry point even when the method calls other public methods', async () => {
    await client.writeThenRead('x');

    expect(authService.ensureAuthorized).toHaveBeenCalledTimes(1);
    expect(target.calls).toEqual(['write:x', 'read']);
  });

  it('skips authorization for an unrestricted method', async () => {
    await expect(client.open()).resolves.toBe('open');

    expect(authService.ensureAuthorized).not.toHaveBeenCalled();
  });

  it('fails closed for a function without a declared policy', async () => {
    const helper = Reflect.get(client, 'helper') as () => Promise<string>;

    await expect(helper()).rejects.toMatchObject({
      output: { statusCode: 403 },
      message: 'No authorization policy is declared for "helper"',
    });
    expect(authService.ensureAuthorized).not.toHaveBeenCalled();
  });

  it('passes non-function properties through untouched', () => {
    expect(client.label).toBe('fake');
    expect(client.calls).toBe(target.calls);
  });

  it('keeps the constructor and prototype of the target', () => {
    expect(client.constructor).toBe(FakeClient);
    expect(client).toBeInstanceOf(FakeClient);
  });
});
