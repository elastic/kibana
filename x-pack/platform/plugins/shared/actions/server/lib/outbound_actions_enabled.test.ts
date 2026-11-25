/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '@kbn/connector-specs';
import type { ActionType } from '../types';
import {
  applyOutboundEnabledToConfig,
  assertInboundOrOutboundEnabled,
  assertOutboundActionsToggleAllowed,
  areSecretsOmitted,
  attachOutboundActionsEnabled,
  OUTBOUND_ACTIONS_DISABLED_MESSAGE,
  getOutboundDisabledValidationType,
  getPreconfiguredOutboundConfigError,
  isOutboundActionsDisabledInConfig,
  readOutboundActionsEnabled,
  resolveCreateOutboundActionsEnabled,
  resolveUpdateOutboundActionsEnabled,
} from './outbound_actions_enabled';

jest.mock('@kbn/connector-specs', () => {
  const actual = jest.requireActual('@kbn/connector-specs');
  return {
    ...actual,
    connectorTypeIsDual: jest.fn((actionTypeId: string) => actionTypeId === '.dual'),
  };
});

describe('assertOutboundActionsToggleAllowed', () => {
  it('allows an omitted field on any type', () => {
    expect(() =>
      assertOutboundActionsToggleAllowed({ actionTypeId: '.slack', requestedEnabled: undefined })
    ).not.toThrow();
  });

  it('allows the field on dual types', () => {
    expect(() =>
      assertOutboundActionsToggleAllowed({ actionTypeId: '.dual', requestedEnabled: false })
    ).not.toThrow();
  });

  it('rejects the field on types that are not dual', () => {
    expect(() =>
      assertOutboundActionsToggleAllowed({ actionTypeId: '.slack', requestedEnabled: false })
    ).toThrow(/Outbound actions can only be turned off/);
  });
});

describe('resolveCreateOutboundActionsEnabled', () => {
  it('is on when the field is omitted', () => {
    expect(
      resolveCreateOutboundActionsEnabled({ actionTypeId: '.dual', requestedEnabled: undefined })
    ).toBe(true);
  });

  it('follows an explicit value on dual types', () => {
    expect(
      resolveCreateOutboundActionsEnabled({ actionTypeId: '.dual', requestedEnabled: false })
    ).toBe(false);
    expect(
      resolveCreateOutboundActionsEnabled({ actionTypeId: '.dual', requestedEnabled: true })
    ).toBe(true);
  });

  it('is always on for types that are not dual', () => {
    expect(
      resolveCreateOutboundActionsEnabled({ actionTypeId: '.slack', requestedEnabled: false })
    ).toBe(true);
  });
});

describe('resolveUpdateOutboundActionsEnabled', () => {
  it('keeps the previous value when the field is omitted', () => {
    expect(
      resolveUpdateOutboundActionsEnabled({
        actionTypeId: '.dual',
        requestedEnabled: undefined,
        previouslyEnabled: false,
      })
    ).toBe(false);
    expect(
      resolveUpdateOutboundActionsEnabled({
        actionTypeId: '.dual',
        requestedEnabled: undefined,
        previouslyEnabled: true,
      })
    ).toBe(true);
  });

  it('uses an explicit value on dual types', () => {
    expect(
      resolveUpdateOutboundActionsEnabled({
        actionTypeId: '.dual',
        requestedEnabled: true,
        previouslyEnabled: false,
      })
    ).toBe(true);
    expect(
      resolveUpdateOutboundActionsEnabled({
        actionTypeId: '.dual',
        requestedEnabled: false,
        previouslyEnabled: true,
      })
    ).toBe(false);
  });

  it('is always on for types that are not dual', () => {
    expect(
      resolveUpdateOutboundActionsEnabled({
        actionTypeId: '.slack',
        requestedEnabled: false,
        previouslyEnabled: false,
      })
    ).toBe(true);
  });
});

describe('assertInboundOrOutboundEnabled', () => {
  it('throws when a dual type has both directions off', () => {
    expect(() =>
      assertInboundOrOutboundEnabled({
        actionTypeId: '.dual',
        isInboundEventsEnabled: false,
        isOutboundActionsEnabled: false,
      })
    ).toThrow(/at least one of inbound events or outbound actions/);
  });

  it.each([
    [true, false],
    [false, true],
    [true, true],
  ])('allows inbound %s and outbound %s', (isInboundEventsEnabled, isOutboundActionsEnabled) => {
    expect(() =>
      assertInboundOrOutboundEnabled({
        actionTypeId: '.dual',
        isInboundEventsEnabled,
        isOutboundActionsEnabled,
      })
    ).not.toThrow();
  });

  it('does not check types that are not dual', () => {
    expect(() =>
      assertInboundOrOutboundEnabled({
        actionTypeId: '.slack',
        isInboundEventsEnabled: false,
        isOutboundActionsEnabled: false,
      })
    ).not.toThrow();
  });
});

describe('readOutboundActionsEnabled', () => {
  it('is undefined for types that are not dual', () => {
    expect(
      readOutboundActionsEnabled({ actionTypeId: '.slack', config: { outboundEnabled: false } })
    ).toBeUndefined();
  });

  it('is on when the key is missing', () => {
    expect(readOutboundActionsEnabled({ actionTypeId: '.dual', config: {} })).toBe(true);
    expect(readOutboundActionsEnabled({ actionTypeId: '.dual' })).toBe(true);
  });

  it('is off when the key is false', () => {
    expect(
      readOutboundActionsEnabled({ actionTypeId: '.dual', config: { outboundEnabled: false } })
    ).toBe(false);
  });
});

describe('applyOutboundEnabledToConfig', () => {
  it('removes a client value and writes nothing when on', () => {
    expect(applyOutboundEnabledToConfig({ a: 1, outboundEnabled: false }, true)).toEqual({ a: 1 });
  });

  it('writes false when off, and ignores a client value of true', () => {
    expect(applyOutboundEnabledToConfig({ a: 1, outboundEnabled: true }, false)).toEqual({
      a: 1,
      outboundEnabled: false,
    });
  });

  it('does not change the input', () => {
    const input = { a: 1 };
    applyOutboundEnabledToConfig(input, false);
    expect(input).toEqual({ a: 1 });
  });
});

describe('attachOutboundActionsEnabled', () => {
  it('sets the value on dual saved connectors from the config', () => {
    const result = attachOutboundActionsEnabled({
      connectors: [
        { id: 'on', actionTypeId: '.dual', config: {} },
        { id: 'off', actionTypeId: '.dual', config: { outboundEnabled: false } },
      ],
      inMemoryConnectorIdsWithOutboundDisabled: new Set<string>(),
    });
    expect(
      result.map((c) => (c as { isOutboundActionsEnabled?: boolean }).isOutboundActionsEnabled)
    ).toEqual([true, false]);
  });

  it('leaves connectors that are not dual unchanged', () => {
    const connector = { id: 'a', actionTypeId: '.slack', config: { outboundEnabled: false } };
    const [result] = attachOutboundActionsEnabled({
      connectors: [connector],
      inMemoryConnectorIdsWithOutboundDisabled: new Set<string>(),
    });
    expect(result).toBe(connector);
  });

  it('uses the in-memory ids for preconfigured connectors and not for saved ones', () => {
    const result = attachOutboundActionsEnabled({
      connectors: [
        { id: 'shared', actionTypeId: '.dual', isPreconfigured: true },
        { id: 'shared', actionTypeId: '.dual', isPreconfigured: false, config: {} },
      ],
      inMemoryConnectorIdsWithOutboundDisabled: new Set(['shared']),
    });
    expect(
      result.map((c) => (c as { isOutboundActionsEnabled?: boolean }).isOutboundActionsEnabled)
    ).toEqual([false, true]);
  });
});

describe('areSecretsOmitted', () => {
  it('is true for undefined and an empty object', () => {
    expect(areSecretsOmitted(undefined)).toBe(true);
    expect(areSecretsOmitted({})).toBe(true);
  });

  it('is false when any key is sent', () => {
    expect(areSecretsOmitted({ authType: 'none' })).toBe(false);
    expect(areSecretsOmitted({ token: '' })).toBe(false);
  });
});

describe('getOutboundDisabledValidationType', () => {
  const spec = {
    metadata: { id: '.dual' },
    schema: z.object({ instanceUrl: z.url() }),
    actions: { ping: {} },
  } as unknown as ConnectorSpec;

  const strictConfig = { schema: z.object({ instanceUrl: z.url() }) };
  const actionType = {
    id: '.dual',
    validate: { config: strictConfig, secrets: { schema: z.any() }, params: { schema: z.any() } },
  } as unknown as ActionType;

  it('replaces the config validator with one that has optional fields', () => {
    const result = getOutboundDisabledValidationType({ actionType, spec });

    expect(result).not.toBe(actionType);
    expect(result.validate.secrets).toBe(actionType.validate.secrets);
    expect(() => result.validate.config.schema.parse({})).not.toThrow();
    expect(() => actionType.validate.config.schema.parse({})).toThrow();
  });

  it('still validates a field that is sent', () => {
    const result = getOutboundDisabledValidationType({ actionType, spec });

    expect(() => result.validate.config.schema.parse({ instanceUrl: 'nope' })).toThrow();
  });

  it('returns the same type when there is no spec', () => {
    expect(getOutboundDisabledValidationType({ actionType, spec: undefined })).toBe(actionType);
  });
});

describe('OUTBOUND_ACTIONS_DISABLED_MESSAGE', () => {
  it('tells the user how to fix it', () => {
    expect(OUTBOUND_ACTIONS_DISABLED_MESSAGE).toBe(
      'Outbound actions are turned off for this connector. Turn them on to run or test actions.'
    );
  });
});

describe('isOutboundActionsDisabledInConfig', () => {
  it('is true only for a dual type with the key false', () => {
    expect(
      isOutboundActionsDisabledInConfig({
        actionTypeId: '.dual',
        config: { outboundEnabled: false },
      })
    ).toBe(true);
    expect(isOutboundActionsDisabledInConfig({ actionTypeId: '.dual', config: {} })).toBe(false);
    expect(isOutboundActionsDisabledInConfig({ actionTypeId: '.dual', config: undefined })).toBe(
      false
    );
    expect(
      isOutboundActionsDisabledInConfig({
        actionTypeId: '.dual',
        config: { outboundEnabled: true },
      })
    ).toBe(false);
  });

  it('ignores the key on a type that is not dual', () => {
    expect(
      isOutboundActionsDisabledInConfig({
        actionTypeId: '.slack',
        config: { outboundEnabled: false },
      })
    ).toBe(false);
  });
});

describe('getPreconfiguredOutboundConfigError', () => {
  it('is valid when the key is missing', () => {
    expect(
      getPreconfiguredOutboundConfigError({
        actionTypeId: '.dual',
        config: {},
        isInboundEventsEnabled: false,
      })
    ).toBeUndefined();
    expect(
      getPreconfiguredOutboundConfigError({
        actionTypeId: '.slack',
        config: {},
        isInboundEventsEnabled: false,
      })
    ).toBeUndefined();
  });

  it('is an error when the key is set on a type that is not dual', () => {
    expect(
      getPreconfiguredOutboundConfigError({
        actionTypeId: '.slack',
        config: { outboundEnabled: true },
        isInboundEventsEnabled: false,
      })
    ).toMatch(/can only be set on connectors that both send and receive/);
  });

  it('is an error when the key is not a boolean', () => {
    expect(
      getPreconfiguredOutboundConfigError({
        actionTypeId: '.dual',
        config: { outboundEnabled: 'false' },
        isInboundEventsEnabled: true,
      })
    ).toMatch(/must be a boolean/);
  });

  it('is an error when false leaves both directions off', () => {
    expect(
      getPreconfiguredOutboundConfigError({
        actionTypeId: '.dual',
        config: { outboundEnabled: false },
        isInboundEventsEnabled: false,
      })
    ).toMatch(/both inbound events and outbound actions turned off/);
  });

  it('is valid when false and inbound is on, or when true', () => {
    expect(
      getPreconfiguredOutboundConfigError({
        actionTypeId: '.dual',
        config: { outboundEnabled: false },
        isInboundEventsEnabled: true,
      })
    ).toBeUndefined();
    expect(
      getPreconfiguredOutboundConfigError({
        actionTypeId: '.dual',
        config: { outboundEnabled: true },
        isInboundEventsEnabled: false,
      })
    ).toBeUndefined();
  });
});
