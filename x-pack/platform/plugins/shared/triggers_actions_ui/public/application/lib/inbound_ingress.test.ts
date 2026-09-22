/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INBOUND_WEBHOOK_CONNECTOR_TYPE_ID } from '@kbn/connector-specs';
import { createMockActionConnector } from '@kbn/alerts-ui-shared/src/common/test_utils/connector.mock';
import { getInboundIngestToken, isInboundIngressConnector } from './inbound_ingress';

describe('inbound ingress helpers', () => {
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
});
