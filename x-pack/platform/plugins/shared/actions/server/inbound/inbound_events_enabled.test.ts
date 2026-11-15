/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  assertInboundEventsToggleAllowed,
  resolveCreateInboundEventsEnabled,
  resolveInboundEventsEnabled,
  resolveUpdateInboundEventsEnabled,
  shouldMintInboundIdentity,
} from './inbound_events_enabled';

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

describe('resolveInboundEventsEnabled', () => {
  it('follows last-saver identity for inbound-only types', () => {
    expect(
      resolveInboundEventsEnabled({ actionTypeId: '.inboundWebhook', hasIdentity: true })
    ).toBe(true);
    expect(
      resolveInboundEventsEnabled({ actionTypeId: '.inboundWebhook', hasIdentity: false })
    ).toBe(false);
  });

  it('is true for inbound-only types that have events enabled without last-saver identity', () => {
    expect(
      resolveInboundEventsEnabled({
        actionTypeId: '.inboundWebhook',
        hasIdentity: false,
        eventsEnabled: true,
      })
    ).toBe(true);
  });

  it('is false for dual types without last-saver identity', () => {
    expect(resolveInboundEventsEnabled({ actionTypeId: '.dual', hasIdentity: false })).toBe(false);
  });

  it('is true for dual types with last-saver identity', () => {
    expect(resolveInboundEventsEnabled({ actionTypeId: '.dual', hasIdentity: true })).toBe(true);
  });

  it('is true for dual types that have events enabled without last-saver identity', () => {
    expect(
      resolveInboundEventsEnabled({
        actionTypeId: '.dual',
        hasIdentity: false,
        eventsEnabled: true,
      })
    ).toBe(true);
  });

  it('is false for outbound-only types', () => {
    expect(resolveInboundEventsEnabled({ actionTypeId: '.slack', hasIdentity: true })).toBe(false);
  });
});

describe('shouldMintInboundIdentity', () => {
  it('is true for inbound-only only when enabled', () => {
    expect(
      shouldMintInboundIdentity({ actionTypeId: '.inboundWebhook', isInboundEventsEnabled: true })
    ).toBe(true);
    expect(
      shouldMintInboundIdentity({ actionTypeId: '.inboundWebhook', isInboundEventsEnabled: false })
    ).toBe(false);
  });

  it('is true for dual only when enabled', () => {
    expect(shouldMintInboundIdentity({ actionTypeId: '.dual', isInboundEventsEnabled: true })).toBe(
      true
    );
    expect(
      shouldMintInboundIdentity({ actionTypeId: '.dual', isInboundEventsEnabled: false })
    ).toBe(false);
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
    ).toThrow('Inbound events can only be turned on for connectors that receive events.');
  });

  it('allows an explicit flag on inbound-only types', () => {
    expect(() =>
      assertInboundEventsToggleAllowed({
        actionTypeId: '.inboundWebhook',
        requestedEnabled: false,
      })
    ).not.toThrow();
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

  it('defaults inbound-only to on when the flag is omitted', () => {
    expect(
      resolveCreateInboundEventsEnabled({
        actionTypeId: '.inboundWebhook',
        requestedEnabled: undefined,
      })
    ).toBe(true);
  });

  it('creates inbound-only off when the flag is false', () => {
    expect(
      resolveCreateInboundEventsEnabled({
        actionTypeId: '.inboundWebhook',
        requestedEnabled: false,
      })
    ).toBe(false);
  });

  it('is off for outbound-only types', () => {
    expect(
      resolveCreateInboundEventsEnabled({ actionTypeId: '.slack', requestedEnabled: undefined })
    ).toBe(false);
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

  it('turns inbound-only off and on with an explicit flag', () => {
    expect(
      resolveUpdateInboundEventsEnabled({
        actionTypeId: '.inboundWebhook',
        requestedEnabled: false,
        previouslyEnabled: true,
      })
    ).toBe(false);
    expect(
      resolveUpdateInboundEventsEnabled({
        actionTypeId: '.inboundWebhook',
        requestedEnabled: true,
        previouslyEnabled: false,
      })
    ).toBe(true);
  });

  it('keeps the previous inbound-only state when the flag is omitted', () => {
    expect(
      resolveUpdateInboundEventsEnabled({
        actionTypeId: '.inboundWebhook',
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
