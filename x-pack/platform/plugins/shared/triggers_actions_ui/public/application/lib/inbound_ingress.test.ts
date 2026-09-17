/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockActionConnector } from '@kbn/alerts-ui-shared/src/common/test_utils/connector.mock';
import { getInboundIngestToken, isInboundIngressConnector } from './inbound_ingress';

describe('inbound ingress helpers', () => {
  it('treats connectors as inbound ingress when the action type has events', () => {
    const connector = createMockActionConnector({ actionTypeId: '.inboundWebhook' });
    expect(isInboundIngressConnector(connector, true)).toBe(true);
    expect(isInboundIngressConnector(connector, false)).toBe(false);
    expect(isInboundIngressConnector(createMockActionConnector({ actionTypeId: '.http' }))).toBe(
      false
    );
  });

  it('reads the ingest token from connector secrets', () => {
    expect(
      getInboundIngestToken(createMockActionConnector({ secrets: { ingestToken: 'once-token' } }))
    ).toBe('once-token');
  });
});
