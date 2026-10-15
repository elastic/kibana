/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionTypeRegistry } from '../../../action_type_registry';
import { isSandboxCapableConnector } from './is_sandbox_capable_connector';

describe('isSandboxCapableConnector', () => {
  const createRegistry = ({
    has = true,
    sandboxSupportedAuthTypes = ['bearer'],
    isSystemActionType = false,
  }: {
    has?: boolean;
    sandboxSupportedAuthTypes?: readonly string[];
    isSystemActionType?: boolean;
  } = {}): Pick<ActionTypeRegistry, 'has' | 'get'> => ({
    has: jest.fn().mockReturnValue(has),
    get: jest.fn().mockReturnValue({
      sandboxSupportedAuthTypes,
      isSystemActionType,
    }),
  });

  it('returns true when config.authType is in sandboxSupportedAuthTypes', () => {
    expect(
      isSandboxCapableConnector({
        actionTypeId: '.github',
        config: { authType: 'bearer' },
        actionTypeRegistry: createRegistry(),
      })
    ).toBe(true);
  });

  it('falls back to secrets.authType when config.authType is missing', () => {
    expect(
      isSandboxCapableConnector({
        actionTypeId: '.github',
        config: {},
        secrets: { authType: 'bearer' },
        actionTypeRegistry: createRegistry(),
      })
    ).toBe(true);
  });

  it('prefers secrets.authType when it conflicts with config.authType', () => {
    expect(
      isSandboxCapableConnector({
        actionTypeId: '.github',
        config: { authType: 'bearer' },
        secrets: { authType: 'basic' },
        actionTypeRegistry: createRegistry(),
      })
    ).toBe(false);
  });

  it('falls back to config.authType when secrets.authType is missing', () => {
    expect(
      isSandboxCapableConnector({
        actionTypeId: '.github',
        config: { authType: 'bearer' },
        secrets: {},
        actionTypeRegistry: createRegistry(),
      })
    ).toBe(true);
  });

  it('returns false when config.authType is missing', () => {
    expect(
      isSandboxCapableConnector({
        actionTypeId: '.github',
        config: {},
        actionTypeRegistry: createRegistry(),
      })
    ).toBe(false);
  });

  it('returns false when config is missing', () => {
    expect(
      isSandboxCapableConnector({
        actionTypeId: '.github',
        actionTypeRegistry: createRegistry(),
      })
    ).toBe(false);
  });

  it('returns false when auth type is not sandbox-supported', () => {
    expect(
      isSandboxCapableConnector({
        actionTypeId: '.github',
        config: { authType: 'basic' },
        actionTypeRegistry: createRegistry({ sandboxSupportedAuthTypes: ['bearer'] }),
      })
    ).toBe(false);
  });

  it('returns false when the action type has no sandbox-supported auth types', () => {
    expect(
      isSandboxCapableConnector({
        actionTypeId: '.slack',
        config: { authType: 'webhook' },
        actionTypeRegistry: createRegistry({ sandboxSupportedAuthTypes: [] }),
      })
    ).toBe(false);
  });

  it('returns false for unregistered action types', () => {
    const actionTypeRegistry = createRegistry({ has: false });

    expect(
      isSandboxCapableConnector({
        actionTypeId: '.unknown',
        config: { authType: 'bearer' },
        actionTypeRegistry,
      })
    ).toBe(false);
    expect(actionTypeRegistry.get).not.toHaveBeenCalled();
  });

  it('returns false for system action types', () => {
    expect(
      isSandboxCapableConnector({
        actionTypeId: '.cases',
        config: { authType: 'bearer' },
        actionTypeRegistry: createRegistry({ isSystemActionType: true }),
      })
    ).toBe(false);
  });
});
