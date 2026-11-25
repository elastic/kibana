/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { coreMock } from '@kbn/core/public/mocks';
import { cpsPluginMock } from '@kbn/cps/public/mocks';
import type { ICPSManager } from '@kbn/cps-utils';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

import { ApiKeysCpsCallout } from './api_keys_cps_callout';

const createCpsManager = (): ICPSManager => {
  const { cpsManager } = cpsPluginMock.createStartContract();
  if (!cpsManager) {
    throw new Error('expected cpsManager on start contract');
  }
  return cpsManager;
};

describe('ApiKeysCpsCallout', () => {
  const coreStart = coreMock.createStart();

  const renderCallout = (cpsManager?: ICPSManager) =>
    render(
      <I18nProvider>
        <KibanaContextProvider services={coreStart}>
          <ApiKeysCpsCallout cpsManager={cpsManager} />
        </KibanaContextProvider>
      </I18nProvider>
    );

  it('renders nothing when the CPS manager is not available', () => {
    renderCallout(undefined);

    expect(screen.queryByTestId('apiKeysCpsCallout')).not.toBeInTheDocument();
  });

  it('renders nothing when the project has no linked projects', async () => {
    const cpsManager = createCpsManager();
    jest.mocked(cpsManager.hasLinkedProjects).mockReturnValue(false);

    renderCallout(cpsManager);

    await waitFor(() => expect(cpsManager.hasLinkedProjects).toHaveBeenCalled());
    expect(screen.queryByTestId('apiKeysCpsCallout')).not.toBeInTheDocument();
  });

  it('renders the callout with a docs link when the project has linked projects', async () => {
    const cpsManager = createCpsManager();
    jest.mocked(cpsManager.hasLinkedProjects).mockReturnValue(true);

    renderCallout(cpsManager);

    expect(await screen.findByTestId('apiKeysCpsCallout')).toBeInTheDocument();
    expect(
      screen.getByText('Elasticsearch API keys are limited to this project')
    ).toBeInTheDocument();
    expect(screen.getByTestId('apiKeysCpsCalloutLearnMoreLink')).toHaveAttribute(
      'href',
      coreStart.docLinks.links.security.elasticCloudApiKeys
    );
  });

  it('renders nothing when the CPS manager fails to become ready', async () => {
    const cpsManager = createCpsManager();
    jest.mocked(cpsManager.whenReady).mockRejectedValue(new Error('failed to fetch projects'));
    jest.mocked(cpsManager.hasLinkedProjects).mockReturnValue(true);

    renderCallout(cpsManager);

    await waitFor(() => {
      expect(cpsManager.whenReady).toHaveBeenCalled();
      expect(screen.queryByTestId('apiKeysCpsCallout')).not.toBeInTheDocument();
    });
  });
});
