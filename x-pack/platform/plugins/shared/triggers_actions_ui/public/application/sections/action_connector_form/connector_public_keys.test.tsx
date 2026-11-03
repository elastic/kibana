/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { ConnectorPublicKeys } from './connector_public_keys';
import type { AppMockRenderer } from '../test_utils';
import { createAppMockRenderer } from '../test_utils';

describe('ConnectorPublicKeys', () => {
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
    Object.defineProperty(appMockRenderer.coreStart.http.basePath, 'publicBaseUrl', {
      value: 'https://new.example.com',
      configurable: true,
    });
  });

  it('shows the issuer stored with the key, not the issuer for the current public URL', async () => {
    (appMockRenderer.coreStart.http.get as jest.Mock).mockResolvedValue({
      issuer: 'https://old.example.com/api/actions/public/.ssf/ssf-1',
    });

    appMockRenderer.render(<ConnectorPublicKeys connectorTypeId=".ssf" connectorId="ssf-1" />);

    expect(
      await screen.findByDisplayValue('https://old.example.com/api/actions/public/.ssf/ssf-1')
    ).toBeInTheDocument();
    expect(appMockRenderer.coreStart.http.get).toHaveBeenCalledWith(
      '/.well-known/ssf-configuration/api/actions/public/.ssf/ssf-1',
      { prependBasePath: false }
    );
    expect(
      screen.getByDisplayValue('https://new.example.com/api/actions/public/.ssf/ssf-1/jwks.json')
    ).toBeInTheDocument();
  });

  it('fetches the discovery document of a non-default space', async () => {
    jest.spyOn(appMockRenderer.coreStart.http.basePath, 'get').mockReturnValue('/s/space-a');
    (appMockRenderer.coreStart.http.get as jest.Mock).mockResolvedValue({
      issuer: 'https://new.example.com/s/space-a/api/actions/public/.ssf/ssf-1',
    });

    appMockRenderer.render(<ConnectorPublicKeys connectorTypeId=".ssf" connectorId="ssf-1" />);

    expect(
      await screen.findByDisplayValue(
        'https://new.example.com/s/space-a/api/actions/public/.ssf/ssf-1'
      )
    ).toBeInTheDocument();
    expect(appMockRenderer.coreStart.http.get).toHaveBeenCalledWith(
      '/.well-known/ssf-configuration/s/space-a/api/actions/public/.ssf/ssf-1',
      { prependBasePath: false }
    );
  });

  it('shows that the connector has no signing key and hides the URLs', async () => {
    (appMockRenderer.coreStart.http.get as jest.Mock).mockRejectedValue(new Error('Not Found'));

    appMockRenderer.render(<ConnectorPublicKeys connectorTypeId=".ssf" connectorId="ssf-1" />);

    expect(await screen.findByTestId('connectorPublicKeysMissing')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('does not fetch the discovery document before the connector is saved', () => {
    appMockRenderer.render(<ConnectorPublicKeys connectorTypeId=".ssf" />);

    expect(screen.getByText('Kibana manages the signing key')).toBeInTheDocument();
    expect(appMockRenderer.coreStart.http.get).not.toHaveBeenCalled();
  });
});
