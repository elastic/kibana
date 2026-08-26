/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rotateInboundIngressRoute } from './rotate_inbound_ingress';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../lib/license_state.mock';
import { mockHandlerArguments } from '../../_mock_handler_arguments';
import { actionsClientMock } from '../../../actions_client/actions_client.mock';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { createMockConnectorWithMintedSecrets } from '../../../application/connector/mocks';

jest.mock('../../verify_access_and_context', () => ({
  verifyAccessAndContext: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
  (verifyAccessAndContext as jest.Mock).mockImplementation((license, handler) => handler);
});

describe('rotateInboundIngressRoute', () => {
  it('rotates inbound ingest credentials', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    rotateInboundIngressRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toBe('/internal/actions/connector/{id}/_rotate_ingress');

    const rotateResult = createMockConnectorWithMintedSecrets({
      id: '1',
      actionTypeId: '.inboundWebhook',
      name: 'sales-ingress',
      config: { ingestTokenHash: 'a'.repeat(64) },
      secrets: { ingestToken: 'new-token' },
    });

    const actionsClient = actionsClientMock.create();
    actionsClient.rotateInboundIngress.mockResolvedValueOnce(rotateResult);

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        params: {
          id: '1',
        },
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toEqual({
      body: {
        id: '1',
        connector_type_id: '.inboundWebhook',
        name: 'sales-ingress',
        config: { ingestTokenHash: 'a'.repeat(64) },
        is_preconfigured: false,
        is_deprecated: false,
        is_system_action: false,
        is_connector_type_deprecated: false,
        secrets: { ingest_token: 'new-token' },
      },
    });

    expect(actionsClient.rotateInboundIngress).toHaveBeenCalledWith({ id: '1' });
  });
});
