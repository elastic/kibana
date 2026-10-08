/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { EndpointUrl } from './endpoint_url';
import type { EndpointUrlProps } from './endpoint_url';

const ES_URL = 'https://my-project.es.example.com';
const DESCRIPTION = 'a description';
const TYPE_SELECTOR = 'a type selector';

const renderEndpointUrl = (overrides: Partial<EndpointUrlProps> = {}) =>
  render(
    <EuiThemeProvider>
      <EndpointUrl
        url={ES_URL}
        isLoading={false}
        copyAriaLabel="Copy Elasticsearch URL"
        copyTelemetryId="aHost-copyEndpointUrl"
        copyTestSubj="aHostCopyUrl"
        {...overrides}
      />
    </EuiThemeProvider>
  );

describe('EndpointUrl', () => {
  it('shows the url it was given', () => {
    renderEndpointUrl();

    expect(screen.getByTestId('endpointUrlValue')).toHaveTextContent(ES_URL);
  });

  it('shows a spinner instead of the panel while loading', () => {
    renderEndpointUrl({ isLoading: true });

    expect(screen.getByTestId('endpointUrlLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('endpointUrlValue')).not.toBeInTheDocument();
  });

  it('labels the copy button and tags it with the telemetry id the host supplied', () => {
    renderEndpointUrl();

    const copyButton = screen.getByTestId('aHostCopyUrl');
    expect(copyButton).toHaveAttribute('aria-label', 'Copy Elasticsearch URL');
    expect(copyButton).toHaveAttribute('data-telemetry-id', 'aHost-copyEndpointUrl');
  });

  it('renders the description it was given', () => {
    renderEndpointUrl({ description: DESCRIPTION });

    expect(screen.getByTestId('endpointUrlDescription')).toHaveTextContent(DESCRIPTION);
  });

  it('omits the description when none is given', () => {
    renderEndpointUrl();

    expect(screen.queryByTestId('endpointUrlDescription')).not.toBeInTheDocument();
  });

  it('renders the type selector it was given', () => {
    renderEndpointUrl({ typeSelector: TYPE_SELECTOR });

    expect(screen.getByTestId('endpointUrlTypeSelector')).toHaveTextContent(TYPE_SELECTOR);
  });

  it('omits the type selector when none is given', () => {
    renderEndpointUrl();

    expect(screen.queryByTestId('endpointUrlTypeSelector')).not.toBeInTheDocument();
  });
});
