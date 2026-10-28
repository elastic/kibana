/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionType } from '../../../types';
import type { ActionTypeRegistry } from '../../../action_type_registry';
import {
  isSandboxCapableConnector,
  isSandboxCapableConnectorType,
} from './is_sandbox_capable_connector';

describe('isSandboxCapableConnectorType', () => {
  it('is true for a type whose spec auth types opted in', () => {
    expect(isSandboxCapableConnectorType({ sandboxSupportedAuthTypes: ['bearer'] })).toBe(true);
  });

  it('is true for a type with a per-instance hook, whatever the hook would answer', () => {
    expect(isSandboxCapableConnectorType({ isSandboxCapable: () => false })).toBe(true);
  });

  it('is false for a type without either', () => {
    expect(isSandboxCapableConnectorType({ sandboxSupportedAuthTypes: [] })).toBe(false);
    expect(isSandboxCapableConnectorType({})).toBe(false);
  });

  it('is false for a system action type', () => {
    expect(
      isSandboxCapableConnectorType({
        isSystemActionType: true,
        sandboxSupportedAuthTypes: ['bearer'],
      })
    ).toBe(false);
  });
});

describe('isSandboxCapableConnector', () => {
  const createRegistry = ({
    has = true,
    sandboxSupportedAuthTypes = ['bearer'],
    isSandboxCapable,
    isSystemActionType = false,
  }: {
    has?: boolean;
    sandboxSupportedAuthTypes?: readonly string[];
    isSandboxCapable?: ActionType['isSandboxCapable'];
    isSystemActionType?: boolean;
  } = {}): Pick<ActionTypeRegistry, 'has' | 'get'> => ({
    has: jest.fn().mockReturnValue(has),
    get: jest.fn().mockReturnValue({
      sandboxSupportedAuthTypes,
      isSandboxCapable,
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

  it('returns true when the isSandboxCapable predicate accepts the instance', () => {
    const isSandboxCapable = jest.fn().mockReturnValue(true);
    expect(
      isSandboxCapableConnector({
        actionTypeId: '.http',
        config: { authType: null },
        actionTypeRegistry: createRegistry({ isSandboxCapable, sandboxSupportedAuthTypes: [] }),
      })
    ).toBe(true);
    expect(isSandboxCapable).toHaveBeenCalledWith({ config: { authType: null }, secrets: {} });
  });

  it('returns false when the isSandboxCapable predicate rejects the instance', () => {
    expect(
      isSandboxCapableConnector({
        actionTypeId: '.http',
        config: { authType: 'ssl' },
        actionTypeRegistry: createRegistry({
          isSandboxCapable: jest.fn().mockReturnValue(false),
          sandboxSupportedAuthTypes: [],
        }),
      })
    ).toBe(false);
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
