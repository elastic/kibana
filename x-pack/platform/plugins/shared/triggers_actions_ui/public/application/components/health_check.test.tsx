/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

import { HealthCheck } from './health_check';
import { I18nProvider } from '@kbn/i18n-react';
import { HealthContextProvider } from '../context/health_context';
import { useKibana } from '../../common/lib/kibana';
jest.mock('../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('health check', () => {
  test('renders spinner while health is loading', async () => {
    useKibanaMock().services.http.get = jest
      .fn()
      .mockImplementationOnce(() => new Promise(() => {}));
    render(
      <I18nProvider>
        <HealthContextProvider>
          <HealthCheck waitForCheck={true}>
            <p>{'shouldnt render'}</p>
          </HealthCheck>
        </HealthContextProvider>
      </I18nProvider>
    );

    expect(screen.getByRole('progressbar', { name: 'Loading' })).toBeInTheDocument();
    expect(screen.queryByText('shouldnt render')).not.toBeInTheDocument();
  });

  it('renders children immediately if waitForCheck is false', async () => {
    useKibanaMock().services.http.get = jest
      .fn()
      .mockImplementationOnce(() => new Promise(() => {}));

    render(
      <I18nProvider>
        <HealthContextProvider>
          <HealthCheck waitForCheck={false}>
            <p>{'should render'}</p>
          </HealthCheck>
        </HealthContextProvider>
      </I18nProvider>
    );

    expect(screen.queryByRole('progressbar', { name: 'Loading' })).not.toBeInTheDocument();
    expect(screen.getByText('should render')).toBeInTheDocument();
  });

  it('renders children if keys are enabled', async () => {
    useKibanaMock().services.http.get = jest.fn().mockResolvedValue({
      is_sufficiently_secure: true,
      has_permanent_encryption_key: true,
      alerting_framework_health: {
        decryption_health: { status: 'ok', timestamp: '2021-04-01T21:29:22.991Z' },
        execution_health: { status: 'ok', timestamp: '2021-04-01T21:29:22.991Z' },
        read_health: { status: 'ok', timestamp: '2021-04-01T21:29:22.991Z' },
      },
      isAlertsAvailable: true,
    });
    render(
      <I18nProvider>
        <HealthContextProvider>
          <HealthCheck waitForCheck={true}>
            <p>{'should render'}</p>
          </HealthCheck>
        </HealthContextProvider>
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('should render')).toBeInTheDocument();
    });
  });

  test('renders warning if API keys are disabled', async () => {
    useKibanaMock().services.http.get = jest.fn().mockImplementation(async () => ({
      is_sufficiently_secure: false,
      has_permanent_encryption_key: true,
      alerting_framework_health: {
        decryption_health: { status: 'ok', timestamp: '2021-04-01T21:29:22.991Z' },
        execution_health: { status: 'ok', timestamp: '2021-04-01T21:29:22.991Z' },
        read_health: { status: 'ok', timestamp: '2021-04-01T21:29:22.991Z' },
      },
      isAlertsAvailable: true,
    }));
    render(
      <I18nProvider>
        <HealthContextProvider>
          <HealthCheck waitForCheck={true}>
            <p>{'should render'}</p>
          </HealthCheck>
        </HealthContextProvider>
      </I18nProvider>
    );

    await waitFor(() => {});

    const [description] = screen.queryAllByText(/API keys/i);
    const [action] = screen.queryAllByText(/Learn more/i);

    expect(description.textContent).toMatchInlineSnapshot(
      `"You must enable API keys to use Alerting. Learn more.(external, opens in a new tab or window)"`
    );

    expect(action.textContent).toMatchInlineSnapshot(
      `"Learn more.(external, opens in a new tab or window)"`
    );

    expect(action.getAttribute('href')).toMatchInlineSnapshot(
      `"https://www.elastic.co/guide/en/elasticsearch/reference/mocked-test-branch/security-settings.html#api-key-service-settings"`
    );
  });

  test('renders warning if encryption key is ephemeral', async () => {
    useKibanaMock().services.http.get = jest.fn().mockImplementation(async () => ({
      is_sufficiently_secure: true,
      has_permanent_encryption_key: false,
      alerting_framework_health: {
        decryption_health: { status: 'ok', timestamp: '2021-04-01T21:29:22.991Z' },
        execution_health: { status: 'ok', timestamp: '2021-04-01T21:29:22.991Z' },
        read_health: { status: 'ok', timestamp: '2021-04-01T21:29:22.991Z' },
      },
      isAlertsAvailable: true,
    }));
    render(
      <I18nProvider>
        <HealthContextProvider>
          <HealthCheck waitForCheck={true}>
            <p>{'should render'}</p>
          </HealthCheck>
        </HealthContextProvider>
      </I18nProvider>
    );

    await waitFor(() => {});
    const description = screen.queryByRole('banner');
    expect(description!.textContent).toMatchInlineSnapshot(
      `"You must configure an encryption key to use Alerting. Learn more.(external, opens in a new tab or window)"`
    );

    const action = screen.queryByText(/Learn/i);
    expect(action!.textContent).toMatchInlineSnapshot(
      `"Learn more.(external, opens in a new tab or window)"`
    );
    expect(action!.getAttribute('href')).toMatchInlineSnapshot(
      `"https://www.elastic.co/guide/en/kibana/mocked-test-branch/alert-action-settings-kb.html#general-alert-action-settings"`
    );
  });

  test('renders warning if encryption key is ephemeral and keys are disabled', async () => {
    useKibanaMock().services.http.get = jest.fn().mockImplementation(async () => ({
      is_sufficiently_secure: false,
      has_permanent_encryption_key: false,
      alerting_framework_health: {
        decryption_health: { status: 'ok', timestamp: '2021-04-01T21:29:22.991Z' },
        execution_health: { status: 'ok', timestamp: '2021-04-01T21:29:22.991Z' },
        read_health: { status: 'ok', timestamp: '2021-04-01T21:29:22.991Z' },
      },
      isAlertsAvailable: true,
    }));

    render(
      <I18nProvider>
        <HealthContextProvider>
          <HealthCheck waitForCheck={true}>
            <p>{'should render'}</p>
          </HealthCheck>
        </HealthContextProvider>
      </I18nProvider>
    );

    await waitFor(() => {});
    const description = screen.queryByText(/You must enable/i);

    expect(description!.textContent).toMatchInlineSnapshot(
      `"You must enable API keys and configure an encryption key to use Alerting. Learn more.(external, opens in a new tab or window)"`
    );

    const action = screen.queryByText(/Learn/i);
    expect(action!.textContent).toMatchInlineSnapshot(
      `"Learn more.(external, opens in a new tab or window)"`
    );
    expect(action!.getAttribute('href')).toMatchInlineSnapshot(
      `"https://www.elastic.co/guide/en/kibana/mocked-test-branch/alerting-setup.html#alerting-prerequisites"`
    );
  });

  it('renders children and no warnings if error thrown getting alerting health', async () => {
    useKibanaMock().services.http.get = jest
      .fn()
      // result from triggers_actions_ui health
      .mockResolvedValueOnce({ isAlertsAvailable: true })
      // result from alerting health
      .mockRejectedValueOnce(new Error('for example, not authorized for rules / 403 response'));
    render(
      <I18nProvider>
        <HealthContextProvider>
          <HealthCheck waitForCheck={true}>
            <p>{'should render'}</p>
          </HealthCheck>
        </HealthContextProvider>
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('should render')).toBeInTheDocument();
    });
  });
});
