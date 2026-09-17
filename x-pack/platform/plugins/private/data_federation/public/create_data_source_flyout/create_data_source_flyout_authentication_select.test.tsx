/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { CreateDataSourceAuthenticationMode } from './create_data_source_flyout_authentication';
import { CreateDataSourceFlyoutAuthenticationSelect } from './create_data_source_flyout_authentication_select';
import { authenticationStrings } from './create_data_source_flyout_authentication_i18n';

const docLinks = {
  links: {
    dataFederation: {
      quickstart: 'https://example.com/data-federation-quickstart',
      staticCredentials: 'https://example.com/data-federation-static-credentials',
      federatedIdentity: 'https://example.com/data-federation-federated-identity',
    },
  },
} as unknown as DocLinksStart;

const renderSelect = ({
  authenticationMode = 'federated_identity',
  enableFederatedIdentity = true,
}: {
  authenticationMode?: CreateDataSourceAuthenticationMode;
  enableFederatedIdentity?: boolean;
} = {}) => {
  const onAuthenticationModeChange = jest.fn();

  const utils = render(
    <EuiProvider>
      <KibanaContextProvider services={{ docLinks }}>
        <CreateDataSourceFlyoutAuthenticationSelect
          dataSourceType="s3"
          authenticationMode={authenticationMode}
          enableFederatedIdentity={enableFederatedIdentity}
          onAuthenticationModeChange={onAuthenticationModeChange}
        />
      </KibanaContextProvider>
    </EuiProvider>
  );

  return { ...utils, onAuthenticationModeChange };
};

const expandDropdown = async (expectedOptionCount: number) => {
  fireEvent.click(screen.getByTestId('createDataSourceFlyoutAuthentication'));

  await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(expectedOptionCount));
};

describe('CreateDataSourceFlyoutAuthenticationSelect', () => {
  it('shows the Recommended badge while the dropdown is collapsed', () => {
    const { getByText, getAllByText } = renderSelect();

    // A single occurrence of the method name means the dropdown is not expanded.
    expect(getAllByText(authenticationStrings.federatedIdentityLabel())).toHaveLength(1);
    expect(getByText(authenticationStrings.recommendedBadge())).toBeInTheDocument();
  });

  it.each([
    [
      'federated_identity' as const,
      authenticationStrings.federatedIdentityDescription.s3(),
      docLinks.links.dataFederation.federatedIdentity,
    ],
    [
      'access_and_secret_keys' as const,
      authenticationStrings.storedCredentialsDescription.s3(),
      docLinks.links.dataFederation.staticCredentials,
    ],
    [
      'anonymous' as const,
      authenticationStrings.anonymousDescription.s3(),
      docLinks.links.dataFederation.quickstart,
    ],
  ])('describes %s and links to its documentation', (authenticationMode, description, href) => {
    const { getByText, getByTestId } = renderSelect({ authenticationMode });

    expect(getByText(description, { exact: false })).toBeInTheDocument();
    expect(
      getByTestId(`createDataSourceFlyoutAuthenticationLearnMore-${authenticationMode}`)
    ).toHaveAttribute('href', href);
  });

  it('offers every method with its description when expanded', async () => {
    const { getByRole } = renderSelect();

    await expandDropdown(3);

    for (const [name, description] of [
      [
        authenticationStrings.federatedIdentityLabel(),
        authenticationStrings.federatedIdentityDescription.s3(),
      ],
      [
        authenticationStrings.accessAndSecretKeysLabel(),
        authenticationStrings.storedCredentialsDescription.s3(),
      ],
      [authenticationStrings.anonymousLabel(), authenticationStrings.anonymousDescription.s3()],
    ]) {
      expect(
        getByRole('option', { name: new RegExp(`${name}.*${description}`) })
      ).toBeInTheDocument();
    }
  });

  it('reports the method picked from the dropdown', async () => {
    const { getByText, onAuthenticationModeChange } = renderSelect();

    await expandDropdown(3);
    fireEvent.click(getByText(authenticationStrings.anonymousLabel()));

    expect(onAuthenticationModeChange).toHaveBeenCalledWith('anonymous');
  });

  it('omits Federated Identity and its badge when the feature flag is off', async () => {
    const { queryByText } = renderSelect({
      authenticationMode: 'access_and_secret_keys',
      enableFederatedIdentity: false,
    });

    await expandDropdown(2);

    expect(queryByText(authenticationStrings.federatedIdentityLabel())).not.toBeInTheDocument();
    expect(queryByText(authenticationStrings.recommendedBadge())).not.toBeInTheDocument();
  });
});
