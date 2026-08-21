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

  it('preserves the stored hash when not force-minting', () => {
    const storedHash = 'b'.repeat(64);
    const result = ensureConnectorIngressCredentials({
      ...baseParams,
      existingConfig: { ingestTokenHash: storedHash },
      forceMint: false,
    });

    expect(result.ingestToken).toBeUndefined();
    expect(result.config).toEqual({ ingestTokenHash: storedHash });
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
