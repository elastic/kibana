/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { rotateInboundIngressRoute } from './rotate_inbound_ingress';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../lib/license_state.mock';
import { mockHandlerArguments } from '../../_mock_handler_arguments';
import { actionsClientMock } from '../../../actions_client/actions_client.mock';
import { verifyAccessAndContext } from '../../verify_access_and_context';
vi.mock('../../verify_access_and_context', () => {
      const mocked = {
      verifyAccessAndContext: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

beforeEach(() => {
  vi.resetAllMocks();
  (verifyAccessAndContext as Mock).mockImplementation((license, handler) => handler);
});

describe('rotateInboundIngressRoute', () => {
  it('rotates inbound ingest credentials', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    rotateInboundIngressRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toBe('/internal/actions/connector/{id}/_rotate_event_token');

    const actionsClient = actionsClientMock.create();
    actionsClient.rotateInboundIngress.mockResolvedValueOnce({ ingestToken: 'new-token' });

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
        ingest_token: 'new-token',
      },
    });

    expect(actionsClient.rotateInboundIngress).toHaveBeenCalledWith({ id: '1' });
  });
});
