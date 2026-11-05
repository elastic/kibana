/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { createDefaultUnit } from '../../../services/unit_repository';
import { CreateDestinationModal } from './create_destination_modal';

const NAME_REQUIRED = 'Enter a destination name.';
const LOGS_PATTERN_REQUIRED = 'Enter a write pattern for logs.';

const renderModal = () => {
  const createDestination = jest.fn();
  render(
    <I18nProvider>
      <CreateDestinationModal
        destinations={{
          createDestination,
          unitDefinition: createDefaultUnit(),
          isUnitSaving: false,
          isCreatingDestination: false,
          isCreateFailed: false,
        }}
        onClose={jest.fn()}
      />
    </I18nProvider>
  );
  return { createDestination };
};

// Typing long values key by key times out on CI.
const pasteInto = async (testSubject: string, value: string) => {
  await userEvent.click(screen.getByTestId(testSubject));
  await userEvent.paste(value);
};

describe('CreateDestinationModal', () => {
  it('only shows the errors of fields the user has left', async () => {
    renderModal();

    await userEvent.click(screen.getByTestId('streamsCreateDestinationCustomWritePatterns'));
    await userEvent.click(screen.getByTestId('streamsCreateDestinationCustomSignal-logs'));

    expect(screen.queryByText(LOGS_PATTERN_REQUIRED)).not.toBeInTheDocument();
    expect(screen.queryByText(NAME_REQUIRED)).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('streamsCreateDestination-logs-index'));
    await userEvent.tab();

    expect(screen.getByText(LOGS_PATTERN_REQUIRED)).toBeInTheDocument();
    expect(screen.queryByText(NAME_REQUIRED)).not.toBeInTheDocument();
  });

  it('submits the form values', async () => {
    const { createDestination } = renderModal();

    await userEvent.type(screen.getByTestId('streamsCreateDestinationName'), 'Prod logs');
    await userEvent.click(screen.getByTestId('streamsCreateDestinationSubmit'));

    await waitFor(() =>
      expect(createDestination).toHaveBeenCalledWith(
        expect.objectContaining({
          storageKind: 'local_elasticsearch',
          destinationName: 'Prod logs',
          elasticsearch: expect.objectContaining({ auto: true }),
        }),
        expect.anything()
      )
    );
  });

  describe('remote Elasticsearch', () => {
    const ENDPOINT_REQUIRED = 'Enter the endpoint of the remote cluster.';
    const API_KEY_REQUIRED = 'Enter an API key.';

    it('only shows connection errors after their input is left', async () => {
      renderModal();
      await userEvent.click(screen.getByTestId('streamsCreateDestinationRemoteElasticsearch'));

      expect(screen.queryByText(ENDPOINT_REQUIRED)).not.toBeInTheDocument();

      await userEvent.click(
        screen.getByTestId('streamsCreateDestinationRemoteElasticsearchEndpoint')
      );
      await userEvent.tab();

      expect(screen.getByText(ENDPOINT_REQUIRED)).toBeInTheDocument();
      expect(screen.queryByText(API_KEY_REQUIRED)).not.toBeInTheDocument();
    });

    it('submits the remote form values', async () => {
      const { createDestination } = renderModal();
      await userEvent.click(screen.getByTestId('streamsCreateDestinationRemoteElasticsearch'));
      await userEvent.click(screen.getByRole('radio', { name: 'Fixed index per signal' }));
      await pasteInto('streamsCreateDestinationIndex', 'shared-idx');
      await pasteInto(
        'streamsCreateDestinationRemoteElasticsearchEndpoint',
        'https://es.example.com:443'
      );
      await pasteInto('streamsCreateDestinationRemoteElasticsearchApiKey', 'remote-key');
      await pasteInto('streamsCreateDestinationName', 'Central');
      await userEvent.click(screen.getByTestId('streamsCreateDestinationSubmit'));

      await waitFor(() =>
        expect(createDestination).toHaveBeenCalledWith(
          expect.objectContaining({
            storageKind: 'remote_elasticsearch',
            destinationName: 'Central',
            remoteElasticsearch: expect.objectContaining({
              auto: false,
              logsIndex: 'shared-idx',
              metricsIndex: 'shared-idx',
              tracesIndex: 'shared-idx',
              endpoint: 'https://es.example.com:443',
              apiKey: 'remote-key',
            }),
          }),
          expect.anything()
        )
      );
    });
  });
});
