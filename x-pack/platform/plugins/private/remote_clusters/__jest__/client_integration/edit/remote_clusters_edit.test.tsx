/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import { EuiComboBoxTestHarness } from '@kbn/test-eui-helpers';

import { RemoteClusterAdd, RemoteClusterEdit } from '../../../public/application/sections';
import type { Cluster } from '../../../common/lib';
import { SECURITY_MODEL } from '../../../common/constants';

import { renderRemoteClustersRoute } from '../helpers/render';
import { setupEnvironment } from '../helpers/setup_environment';

const REMOTE_CLUSTER_EDIT_NAME = 'new-york';

const REMOTE_CLUSTER_EDIT: Cluster = {
  name: REMOTE_CLUSTER_EDIT_NAME,
  seeds: ['localhost:9400'],
  skipUnavailable: true,
  securityModel: SECURITY_MODEL.CERTIFICATE,
};

describe('Edit Remote cluster', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  const renderEdit = (cluster: Cluster, contextOverrides: Record<string, unknown> = {}) => {
    httpRequestsMockHelpers.setLoadRemoteClustersResponse([cluster]);
    return renderRemoteClustersRoute(RemoteClusterEdit, {
      httpSetup,
      contextOverrides,
      routePath: '/:name',
      initialEntries: [`/${REMOTE_CLUSTER_EDIT_NAME}`],
    });
  };

  test('should have the title of the page set correctly', async () => {
    renderEdit(REMOTE_CLUSTER_EDIT);
    expect(await screen.findByTestId('remoteClusterPageTitle')).toHaveTextContent(
      'Edit remote cluster'
    );
  });

  test('should have a link to the documentation', async () => {
    renderEdit(REMOTE_CLUSTER_EDIT);
    expect(await screen.findByTestId('remoteClusterDocsButton')).toBeInTheDocument();
  });

  test('should use the same Form component as the "<RemoteClusterAdd />" component', async () => {
    // Edit renders the form directly.
    const edit = renderEdit(REMOTE_CLUSTER_EDIT);
    expect(await screen.findByTestId('remoteClusterForm')).toBeInTheDocument();
    edit.unmount();

    // Add renders the wizard; the form is shown after completing the trust step.
    const { user } = renderRemoteClustersRoute(RemoteClusterAdd, {
      httpSetup,
      routePath: '/add',
      initialEntries: ['/add'],
    });

    await user.click(await screen.findByTestId('setupTrustApiMode'));
    await user.click(screen.getByTestId('remoteClusterTrustNextButton'));

    expect(await screen.findByTestId('remoteClusterForm')).toBeInTheDocument();
  });

  test('should populate the form fields with the values from the remote cluster loaded', async () => {
    renderEdit(REMOTE_CLUSTER_EDIT);

    const nameInput = await screen.findByTestId('remoteClusterFormNameInput');
    expect(nameInput).toHaveValue(REMOTE_CLUSTER_EDIT_NAME);

    const seeds = new EuiComboBoxTestHarness('remoteClusterFormSeedsInput');
    expect(seeds.getSelected()).toContain(REMOTE_CLUSTER_EDIT.seeds?.[0] ?? '');

    const skipUnavailable = screen.getByTestId('remoteClusterFormSkipUnavailableFormToggle');
    expect(skipUnavailable).toHaveAttribute(
      'aria-checked',
      String(REMOTE_CLUSTER_EDIT.skipUnavailable)
    );
  });

  test('should disable the form name input', async () => {
    renderEdit(REMOTE_CLUSTER_EDIT);
    expect(await screen.findByTestId('remoteClusterFormNameInput')).toBeDisabled();
  });

  describe('on cloud', () => {
    const cloudUrl = 'cloud-url';
    const defaultCloudPort = '9400';

    test('existing cluster that has the same TLS server name as the host in the remote address', async () => {
      const cluster: Cluster = {
        name: REMOTE_CLUSTER_EDIT_NAME,
        mode: 'proxy',
        proxyAddress: `${cloudUrl}:${defaultCloudPort}`,
        serverName: cloudUrl,
        securityModel: SECURITY_MODEL.CERTIFICATE,
      };

      renderEdit(cluster, { isCloudEnabled: true });

      expect(await screen.findByTestId('remoteClusterFormRemoteAddressInput')).toHaveValue(
        `${cloudUrl}:${defaultCloudPort}`
      );
      expect(screen.queryByTestId('remoteClusterFormTLSServerNameFormRow')).not.toBeInTheDocument();
    });

    test("existing cluster that doesn't have a TLS server name", async () => {
      const cluster: Cluster = {
        name: REMOTE_CLUSTER_EDIT_NAME,
        mode: 'proxy',
        proxyAddress: `${cloudUrl}:9500`,
        securityModel: SECURITY_MODEL.CERTIFICATE,
      };

      renderEdit(cluster, { isCloudEnabled: true });

      expect(await screen.findByTestId('remoteClusterFormRemoteAddressInput')).toHaveValue(
        `${cloudUrl}:9500`
      );
      expect(screen.getByTestId('remoteClusterFormTLSServerNameFormRow')).toBeInTheDocument();
    });

    test('existing cluster that has remote address different from TLS server name)', async () => {
      const cluster: Cluster = {
        name: REMOTE_CLUSTER_EDIT_NAME,
        mode: 'proxy',
        proxyAddress: `${cloudUrl}:${defaultCloudPort}`,
        serverName: 'another-value',
        securityModel: SECURITY_MODEL.CERTIFICATE,
      };

      renderEdit(cluster, { isCloudEnabled: true });

      expect(await screen.findByTestId('remoteClusterFormRemoteAddressInput')).toHaveValue(
        `${cloudUrl}:${defaultCloudPort}`
      );
      expect(screen.getByTestId('remoteClusterFormTLSServerNameFormRow')).toBeInTheDocument();
    });
  });
});
