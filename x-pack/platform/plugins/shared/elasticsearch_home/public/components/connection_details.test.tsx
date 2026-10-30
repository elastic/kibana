/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { openWiredConnectionDetails } from '@kbn/cloud/connection_details';
import { renderWithHomeContext } from '../test_utils';
import { useElasticsearchUrl } from '../hooks/use_elasticsearch_url';
import { ConnectionDetails } from './connection_details';

jest.mock('@kbn/cloud/connection_details', () => ({
  openWiredConnectionDetails: jest.fn(),
}));
jest.mock('../hooks/use_elasticsearch_url', () => ({ useElasticsearchUrl: jest.fn() }));

const mockUseElasticsearchUrl = useElasticsearchUrl as jest.Mock;
const mockOpenConnectionDetails = openWiredConnectionDetails as jest.Mock;

const ES_URL = 'https://my-project.es.example.com';

/** The "Generate API key" button only renders at the `xl` breakpoint, which starts at 1200px. */
const setViewportWidth = (value: number) =>
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value });

describe('ConnectionDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setViewportWidth(1280);
    mockUseElasticsearchUrl.mockReturnValue({ url: ES_URL, isLoading: false });
  });

  it('shows the endpoint url with a copy button', () => {
    renderWithHomeContext(<ConnectionDetails />);

    expect(screen.getByText(ES_URL)).toBeInTheDocument();
    expect(screen.getByTestId('elasticsearchHomeCopyEndpointUrl')).toBeInTheDocument();
  });

  it('renders nothing when cloud reports no endpoint', () => {
    mockUseElasticsearchUrl.mockReturnValue({ url: null, isLoading: false });

    renderWithHomeContext(<ConnectionDetails />);

    expect(
      screen.queryByTestId('elasticsearchHomeConnectionDetailsButton')
    ).not.toBeInTheDocument();
  });

  it('opens the connection details flyout on the API keys tab', async () => {
    renderWithHomeContext(<ConnectionDetails />);

    await userEvent.click(screen.getByTestId('elasticsearchHomeGenerateApiKeyButton'));

    expect(mockOpenConnectionDetails).toHaveBeenCalledWith({
      props: { options: { defaultTabId: 'apiKeys' } },
    });
  });

  it('opens the connection details flyout on its default tab', async () => {
    renderWithHomeContext(<ConnectionDetails />);

    await userEvent.click(screen.getByTestId('elasticsearchHomeConnectionDetailsButton'));

    expect(mockOpenConnectionDetails).toHaveBeenCalledWith();
  });

  it('drops the API key button below the xl breakpoint, to keep the header from overflowing', () => {
    setViewportWidth(800);

    renderWithHomeContext(<ConnectionDetails />);

    expect(screen.queryByTestId('elasticsearchHomeGenerateApiKeyButton')).not.toBeInTheDocument();
    expect(screen.getByTestId('elasticsearchHomeConnectionDetailsButton')).toBeInTheDocument();
  });

  it('namespaces its telemetry ids under the host prefix', () => {
    renderWithHomeContext(<ConnectionDetails />);

    expect(screen.getByTestId('elasticsearchHomeCopyEndpointUrl')).toHaveAttribute(
      'data-telemetry-id',
      'testHost-home-copyEndpointUrl'
    );
    expect(screen.getByTestId('elasticsearchHomeGenerateApiKeyButton')).toHaveAttribute(
      'data-telemetry-id',
      'testHost-home-connectionDetails-apiKeys'
    );
  });
});
