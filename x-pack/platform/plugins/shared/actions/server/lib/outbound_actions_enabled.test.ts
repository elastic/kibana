/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  applyOutboundEnabledToConfig,
  assertInboundOrOutboundEnabled,
  assertOutboundActionsToggleAllowed,
  attachOutboundActionsEnabled,
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
