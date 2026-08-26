/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorWithMintedSecrets } from '../../../../application/connector/types';
import { transformConnectorResponse } from './v1';

describe('transformConnectorResponse', () => {
  const baseConnector: ConnectorWithMintedSecrets = {
    id: 'id-1',
    name: 'Sales ingress',
    actionTypeId: '.inboundWebhook',
    config: {},
    isPreconfigured: false,
    isDeprecated: false,
    isSystemAction: false,
    isConnectorTypeDeprecated: false,
  };

  it('maps one-time ingestToken to secrets.ingest_token', () => {
    expect(
      transformConnectorResponse({
        ...baseConnector,
        secrets: { ingestToken: 'once-token' },
      })
    ).toEqual(
      expect.objectContaining({
        id: 'id-1',
        connector_type_id: '.inboundWebhook',
        secrets: { ingest_token: 'once-token' },
      })
    );
  });

  it('omits secrets when no one-time token is present', () => {
    expect(transformConnectorResponse(baseConnector).secrets).toBeUndefined();
  });
});
