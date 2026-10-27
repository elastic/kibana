/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INBOUND_WEBHOOK_CONNECTOR_TYPE_ID } from '@kbn/connector-specs';
import { createMockActionConnector } from '@kbn/alerts-ui-shared/src/common/test_utils/connector.mock';
import {
  getInboundIngestToken,
  isInboundEventsEnabledPayload,
  isInboundIngressConnector,
  readClusterInboundEventsEnabled,
  shouldRotateInboundAfterSave,
} from './inbound_ingress';

jest.mock('@kbn/connector-specs', () => {
  const actual = jest.requireActual('@kbn/connector-specs');
  return {
    ...actual,
    connectorTypeIsDual: jest.fn((id: string) => id === '.dual'),
    connectorTypeIsInboundOnly: jest.fn((id: string) => id === '.inboundWebhook'),
  };
});

describe('inbound ingress helpers', () => {
  it('reads the cluster flag from connector services before the host actions contract', () => {
    expect(readClusterInboundEventsEnabled({})).toBe(false);
    expect(readClusterInboundEventsEnabled({ actions: {} })).toBe(false);
    expect(readClusterInboundEventsEnabled({ actions: { isInboundEventsEnabled: false } })).toBe(
      false
    );
    expect(readClusterInboundEventsEnabled({ actions: { isInboundEventsEnabled: true } })).toBe(
      true
    );
    expect(readClusterInboundEventsEnabled({}, { isInboundEventsEnabled: true })).toBe(true);
    expect(
      readClusterInboundEventsEnabled(
        { actions: { isInboundEventsEnabled: true } },
        { isInboundEventsEnabled: false }
      )
    ).toBe(false);
  });

  it('treats connectors with inbound events as inbound ingress', () => {
    expect(
      isInboundIngressConnector(
        createMockActionConnector({ actionTypeId: INBOUND_WEBHOOK_CONNECTOR_TYPE_ID })
      )
    ).toBe(true);
    expect(
      isInboundIngressConnector(
        createMockActionConnector({
          actionTypeId: '.http',
          config: { ingestTokenHash: 'a'.repeat(64) },
        })
      )
    ).toBe(false);
    expect(isInboundIngressConnector(createMockActionConnector({ actionTypeId: '.http' }))).toBe(
      false
    );
  });

  it('reads the ingest token from connector secrets', () => {
    expect(
      getInboundIngestToken(createMockActionConnector({ secrets: { ingestToken: 'once-token' } }))
    ).toBe('once-token');
  });

  it('sends isInboundEventsEnabled only for dual types when the cluster flag is on', () => {
    expect(isInboundEventsEnabledPayload('.dual', true, true)).toEqual({
      isInboundEventsEnabled: true,
    });
    expect(isInboundEventsEnabledPayload('.dual', false, true)).toEqual({
      isInboundEventsEnabled: false,
    });
    expect(isInboundEventsEnabledPayload('.dual', true, false)).toEqual({});
    expect(isInboundEventsEnabledPayload('.dual', false, false)).toEqual({});
    expect(isInboundEventsEnabledPayload('.inboundWebhook', true, true)).toEqual({});
    expect(isInboundEventsEnabledPayload('.http', true, true)).toEqual({});
  });

  it('rotates after save for inbound-only and enabled dual when the cluster flag is on', () => {
    expect(shouldRotateInboundAfterSave({ actionTypeId: '.inboundWebhook' }, true)).toBe(true);
    expect(
      shouldRotateInboundAfterSave({ actionTypeId: '.dual', isInboundEventsEnabled: true }, true)
    ).toBe(true);
    expect(
      shouldRotateInboundAfterSave({ actionTypeId: '.dual', isInboundEventsEnabled: false }, true)
    ).toBe(false);
    expect(shouldRotateInboundAfterSave({ actionTypeId: '.http' }, true)).toBe(false);
    expect(shouldRotateInboundAfterSave({ actionTypeId: '.inboundWebhook' }, false)).toBe(false);
    expect(
      shouldRotateInboundAfterSave({ actionTypeId: '.dual', isInboundEventsEnabled: true }, false)
    ).toBe(false);
  });
});
