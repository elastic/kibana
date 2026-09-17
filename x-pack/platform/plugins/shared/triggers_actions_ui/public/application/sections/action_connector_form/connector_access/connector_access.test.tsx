/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { createMockActionConnector } from '@kbn/alerts-ui-shared/src/common/test_utils/connector.mock';
import type { ConnectorAccessControlApiResponse } from '@kbn/actions-plugin/common';
import { ConnectorAccess } from './connector_access';
import type { AppMockRenderer } from '../../test_utils';
import { createAppMockRenderer } from '../../test_utils';

const connector = createMockActionConnector({ id: 'connector-1', name: 'My connector' });

const ownerProfile = {
  uid: 'owner-uid',
  enabled: true,
  data: {},
  user: { username: 'owner', full_name: 'Connector Owner' },
};

const buildResponse = (
  overrides: Partial<ConnectorAccessControlApiResponse> = {}
): ConnectorAccessControlApiResponse => ({
  permissions: { read: true, execute: true, edit: true, manage: true },
  owner: 'owner-uid',
  access_control: { access_mode: 'private', entries: [] },
  profiles: [ownerProfile],
  current_user_profile_id: 'owner-uid',
  ...overrides,
});

describe('ConnectorAccess', () => {
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
  });

  it('shows the current visibility and owner to a user that can manage the connector', async () => {
    appMockRenderer.coreStart.http.get = jest.fn().mockResolvedValue(buildResponse());
    appMockRenderer.coreStart.http.post = jest.fn().mockResolvedValue([]);

    appMockRenderer.render(<ConnectorAccess connector={connector} />);

    expect(await screen.findByTestId('connectorAccessTab')).toBeInTheDocument();
    expect(screen.getByTestId('entityAccessControlMode')).toHaveTextContent('Private');
    expect(screen.getByText('Connector Owner')).toBeInTheDocument();
    expect(screen.getByText('Owner (you)')).toBeInTheDocument();
    expect(screen.getByTestId('connectorAccessSaveButton')).toBeEnabled();
    expect(screen.queryByTestId('connectorAccessReadOnlyCallout')).not.toBeInTheDocument();
  });

  it('disables editing for a user that cannot manage the connector', async () => {
    appMockRenderer.coreStart.http.get = jest.fn().mockResolvedValue(
      buildResponse({
        permissions: { read: true, execute: true, edit: false, manage: false },
        owner: undefined,
        access_control: undefined,
        profiles: [],
        current_user_profile_id: 'executor-uid',
      })
    );

    appMockRenderer.render(<ConnectorAccess connector={connector} />);

    expect(await screen.findByTestId('connectorAccessReadOnlyCallout')).toBeInTheDocument();
    expect(screen.queryByTestId('entityAccessControlMode')).not.toBeInTheDocument();
    expect(screen.queryByTestId('connectorAccessSaveButton')).not.toBeInTheDocument();
  });

  it('saves the access control through the internal API', async () => {
    appMockRenderer.coreStart.http.get = jest.fn().mockResolvedValue(buildResponse());
    appMockRenderer.coreStart.http.post = jest.fn().mockResolvedValue([]);
    appMockRenderer.coreStart.http.put = jest.fn().mockResolvedValue(undefined);

    appMockRenderer.render(<ConnectorAccess connector={connector} />);

    (await screen.findByTestId('connectorAccessSaveButton')).click();

    await waitFor(() => {
      expect(appMockRenderer.coreStart.http.put).toHaveBeenCalledWith(
        '/internal/actions/connector/connector-1/access_control',
        { body: JSON.stringify({ access_mode: 'private', entries: [] }) }
      );
    });
  });
});
