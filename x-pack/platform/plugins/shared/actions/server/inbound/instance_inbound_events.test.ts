/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  assertInboundEventsToggleAllowed,
  hasInboundEventIdentityAttributes,
  resolveCreateInboundEventsEnabled,
  resolveInboundEventsEnabled,
  resolveUpdateInboundEventsEnabled,
  shouldMintInboundIdentity,
} from './instance_inbound_events';

jest.mock('@kbn/connector-specs', () => {
  const actual = jest.requireActual('@kbn/connector-specs');
  return {
    ...actual,
    connectorTypeIsInboundOnly: jest.fn(
      (actionTypeId: string) => actionTypeId === '.inboundWebhook'
    ),
    connectorTypeIsDual: jest.fn((actionTypeId: string) => actionTypeId === '.dual'),
    connectorTypeHasInboundEvents: jest.fn(
      (actionTypeId: string) => actionTypeId === '.inboundWebhook' || actionTypeId === '.dual'
    ),
  };
});

describe('hasInboundEventIdentityAttributes', () => {
  it('is true when a last-saver key is present', () => {
    expect(hasInboundEventIdentityAttributes({ apiKey: 'stored' })).toBe(true);
    expect(hasInboundEventIdentityAttributes({ uiamApiKey: 'uiam' })).toBe(true);
  });

  it('is false when no identity fields are set', () => {
    expect(hasInboundEventIdentityAttributes({})).toBe(false);
    expect(hasInboundEventIdentityAttributes({ apiKey: null, uiamApiKey: null })).toBe(false);
  });
});

describe('resolveInboundEventsEnabled', () => {
  it('is always true for inbound-only types', () => {
    expect(
      resolveInboundEventsEnabled({ actionTypeId: '.inboundWebhook', hasIdentity: false })
    ).toBe(true);
  });

  it('is false for dual types without last-saver identity', () => {
    expect(resolveInboundEventsEnabled({ actionTypeId: '.dual', hasIdentity: false })).toBe(false);
  });

  it('is true for dual types with last-saver identity', () => {
    expect(resolveInboundEventsEnabled({ actionTypeId: '.dual', hasIdentity: true })).toBe(true);
  });

  it('is false for outbound-only types', () => {
    expect(resolveInboundEventsEnabled({ actionTypeId: '.slack', hasIdentity: true })).toBe(false);
  });
});

describe('shouldMintInboundIdentity', () => {
  it('is true for inbound-only regardless of the flag', () => {
    expect(
      shouldMintInboundIdentity({ actionTypeId: '.inboundWebhook', inboundEventsEnabled: false })
    ).toBe(true);
  });

  it('is true for dual only when enabled', () => {
    expect(shouldMintInboundIdentity({ actionTypeId: '.dual', inboundEventsEnabled: true })).toBe(
      true
    );
    expect(shouldMintInboundIdentity({ actionTypeId: '.dual', inboundEventsEnabled: false })).toBe(
      false
    );
  });
});

describe('assertInboundEventsToggleAllowed', () => {
  it('allows omitting the flag on any type', () => {
    expect(() =>
      assertInboundEventsToggleAllowed({ actionTypeId: '.slack', requestedEnabled: undefined })
    ).not.toThrow();
    expect(() =>
      assertInboundEventsToggleAllowed({
        actionTypeId: '.inboundWebhook',
        requestedEnabled: undefined,
      })
    ).not.toThrow();
  });

  it('allows an explicit flag on dual types', () => {
    expect(() =>
      assertInboundEventsToggleAllowed({ actionTypeId: '.dual', requestedEnabled: true })
    ).not.toThrow();
  });

  it('rejects an explicit flag on outbound-only types', () => {
    expect(() =>
      assertInboundEventsToggleAllowed({ actionTypeId: '.slack', requestedEnabled: true })
    ).toThrow('Inbound events can only be turned on for connectors that both send and receive.');
  });

  it('rejects an explicit flag on inbound-only types', () => {
    expect(() =>
      assertInboundEventsToggleAllowed({
        actionTypeId: '.inboundWebhook',
        requestedEnabled: false,
      })
    ).toThrow('Inbound events can only be turned on for connectors that both send and receive.');
  });
});

describe('resolveCreateInboundEventsEnabled', () => {
  it('defaults dual to off when the flag is omitted', () => {
    expect(
      resolveCreateInboundEventsEnabled({ actionTypeId: '.dual', requestedEnabled: undefined })
    ).toBe(false);
  });

  it('enables dual when the flag is true', () => {
    expect(
      resolveCreateInboundEventsEnabled({ actionTypeId: '.dual', requestedEnabled: true })
    ).toBe(true);
  });

  it('keeps inbound-only on', () => {
    expect(
      resolveCreateInboundEventsEnabled({
        actionTypeId: '.inboundWebhook',
        requestedEnabled: false,
      })
    ).toBe(true);
  });
});

describe('resolveUpdateInboundEventsEnabled', () => {
  it('keeps the previous dual state when the flag is omitted', () => {
    expect(
      resolveUpdateInboundEventsEnabled({
        actionTypeId: '.dual',
        requestedEnabled: undefined,
        previouslyEnabled: true,
      })
    ).toBe(true);
    expect(
      resolveUpdateInboundEventsEnabled({
        actionTypeId: '.dual',
        requestedEnabled: undefined,
        previouslyEnabled: false,
      })
    ).toBe(false);
  });

  it('honors an explicit dual flag', () => {
    expect(
      resolveUpdateInboundEventsEnabled({
        actionTypeId: '.dual',
        requestedEnabled: false,
        previouslyEnabled: true,
      })
    ).toBe(false);
  });
});
