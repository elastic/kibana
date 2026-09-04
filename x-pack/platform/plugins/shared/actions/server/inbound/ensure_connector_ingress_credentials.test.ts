/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeIngestTokenHash } from './compute_ingest_token_hash';
import {
  applyInboundIngressCredentialsIfNeeded,
  ensureConnectorIngressCredentials,
  generateIngestToken,
  preserveInboundIngressHashIfNeeded,
} from './ensure_connector_ingress_credentials';
import { INBOUND_EVENTS_TOKEN_MAX_LENGTH } from '../../common/routes/events/apis/ingest';

const INBOUND_WEBHOOK_CONNECTOR_TYPE_ID = '.inboundWebhook';

describe('generateIngestToken', () => {
  it('returns a high-entropy token within the hub max length', () => {
    const token = generateIngestToken();
    expect(token.length).toBeGreaterThan(20);
    expect(token.length).toBeLessThanOrEqual(INBOUND_EVENTS_TOKEN_MAX_LENGTH);
    expect(generateIngestToken()).not.toBe(token);
  });
});

describe('ensureConnectorIngressCredentials', () => {
  const baseParams = {
    connectorId: 'sales-ingress',
    spaceId: 'default',
  };

  it('mints a hash on forceMint and returns the raw token once', () => {
    const result = ensureConnectorIngressCredentials({
      ...baseParams,
      existingConfig: { ingestTokenHash: 'a'.repeat(64) },
      forceMint: true,
    });

    expect(result.ingestToken).toEqual(expect.any(String));
    expect(result.config.ingestTokenHash).toBe(
      computeIngestTokenHash({
        connectorId: 'sales-ingress',
        spaceId: 'default',
        token: result.ingestToken!,
      })
    );
    expect(result.config.ingestTokenHash).not.toBe('a'.repeat(64));
  });
});

describe('applyInboundIngressCredentialsIfNeeded', () => {
  it('leaves outbound connector config unchanged', () => {
    expect(
      applyInboundIngressCredentialsIfNeeded({
        actionTypeId: '.http',
        connectorId: 'id-1',
        spaceId: 'default',
        config: { url: 'https://example.com' },
        forceMint: true,
      })
    ).toEqual({ config: { url: 'https://example.com' } });
  });

  it('overlays a minted hash onto inbound-only config', () => {
    const result = applyInboundIngressCredentialsIfNeeded({
      actionTypeId: INBOUND_WEBHOOK_CONNECTOR_TYPE_ID,
      connectorId: 'id-1',
      spaceId: 'default',
      config: { ingestTokenHash: 'd'.repeat(64) },
      forceMint: true,
    });

    expect(result.ingestToken).toEqual(expect.any(String));
    expect(result.config.ingestTokenHash).not.toBe('d'.repeat(64));
  });
});

describe('preserveInboundIngressHashIfNeeded', () => {
  it('leaves outbound connector config unchanged', () => {
    expect(
      preserveInboundIngressHashIfNeeded({
        actionTypeId: '.http',
        config: { url: 'https://example.com' },
        storedConfig: { ingestTokenHash: 'a'.repeat(64) },
      })
    ).toEqual({ url: 'https://example.com' });
  });

  it('keeps the stored hash and drops a client-supplied hash', () => {
    const storedHash = 'b'.repeat(64);
    expect(
      preserveInboundIngressHashIfNeeded({
        actionTypeId: INBOUND_WEBHOOK_CONNECTOR_TYPE_ID,
        config: { ingestTokenHash: 'c'.repeat(64), other: 'kept' },
        storedConfig: { ingestTokenHash: storedHash },
      })
    ).toEqual({ other: 'kept', ingestTokenHash: storedHash });
  });

  it('does not mint when the stored hash is missing', () => {
    expect(
      preserveInboundIngressHashIfNeeded({
        actionTypeId: INBOUND_WEBHOOK_CONNECTOR_TYPE_ID,
        config: { ingestTokenHash: 'c'.repeat(64) },
        storedConfig: {},
      })
    ).toEqual({});
  });
});
