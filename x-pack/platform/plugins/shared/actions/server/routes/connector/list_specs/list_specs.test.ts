/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../lib/license_state.mock';
import { mockHandlerArguments } from '../../_mock_handler_arguments';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { listSpecsRoute } from './list_specs';
import type { ConnectorSpecSummary } from '../../../../common/connector_spec';

jest.mock('../../verify_access_and_context', () => ({
  verifyAccessAndContext: jest.fn(),
}));

describe('listSpecsRoute', () => {
  beforeEach(() => {
    (verifyAccessAndContext as jest.Mock).mockImplementation((license, handler) => handler);
  });

  it('registers an internal route', () => {
    const router = httpServiceMock.createRouter();

    listSpecsRoute(router, licenseStateMock.create(), () => []);

    const [config] = router.get.mock.calls[0];
    expect(config.path).toBe('/internal/actions/connector_types/specs');
    expect(config.options?.access).toBe('internal');
  });

  it('returns the icon and EARS flag of each spec in snake_case', async () => {
    const router = httpServiceMock.createRouter();
    const summaries = [
      { id: '.with-icon', icon: 'logo', isEarsExperimental: true },
      { id: '.no-icon', isEarsExperimental: false },
    ] as ConnectorSpecSummary[];

    listSpecsRoute(router, licenseStateMock.create(), () => summaries);
    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({}, {}, ['ok']);

    expect(await handler(context, req, res)).toEqual({
      body: [
        { id: '.with-icon', icon: 'logo', is_ears_experimental: true },
        { id: '.no-icon', is_ears_experimental: false },
      ],
    });
  });
});
