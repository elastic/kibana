/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, within, waitFor, fireEvent } from '@testing-library/react';
import { EuiComboBoxTestHarness } from '@kbn/test-eui-helpers';

import { MAX_NODE_CONNECTIONS } from '../../../common/constants';
import {
  onPremPrerequisitesApiKey,
  onPremPrerequisitesCert,
  onPremSecurityApiKey,
  onPremSecurityCert,
} from '../../../public/application/services/documentation';
import { RemoteClusterAdd } from '../../../public/application/sections';
import { setupEnvironment } from '../helpers/setup_environment';
import { renderRemoteClustersRoute } from '../helpers/render';

describe('Create Remote cluster', () => {
  const { httpSetup } = setupEnvironment();
  const renderAdd = (contextOverrides: Record<string, unknown> = {}) =>
    renderRemoteClustersRoute(RemoteClusterAdd, {
      httpSetup,
      contextOverrides,
      routePath: '/add',
      initialEntries: ['/add'],
    });

  describe('on component mount', () => {
    test('should have the title of the page set correctly', async () => {
      renderAdd();
      expect(await screen.findByTestId('remoteClusterPageTitle')).toHaveTextContent(
        'Add remote cluster'
      );
    });

    test('should have a link to the documentation', async () => {
      renderAdd();
      expect(await screen.findByTestId('remoteClusterDocsButton')).toBeInTheDocument();
    });

    describe('Setup Trust', () => {
      test('should contain two cards for setting up trust', async () => {
        renderAdd();
        expect(await screen.findByTestId('setupTrustApiMode')).toBeInTheDocument();
        expect(screen.getByTestId('setupTrustCertMode')).toBeInTheDocument();
      });

      test('next button should be disabled if not trust mode selected', async () => {
        renderAdd();
        expect(await screen.findByTestId('remoteClusterTrustNextButton')).toBeDisabled();
      });

      test('next button should be enabled if trust mode selected', async () => {
        const { user } = renderAdd();
        await user.click(await screen.findByTestId('setupTrustApiMode'));
        expect(screen.getByTestId('remoteClusterTrustNextButton')).toBeEnabled();
      });

      test('shows only cert based config if API key trust model is not available', async () => {
        renderAdd({ canUseAPIKeyTrustModel: false });
        expect(screen.queryByTestId('setupTrustApiMode')).not.toBeInTheDocument();
        expect(await screen.findByTestId('setupTrustCertMode')).toBeInTheDocument();
      });
    });
  });

  describe('Form step', () => {
    const goToFormStep = async (options: {
      securityModel: 'api' | 'cert';
      context?: Record<string, unknown>;
    }) => {
      const { securityModel, context = {} } = options;
      const renderResult = renderAdd(context);
      const { user } = renderResult;

      await user.click(
        await screen.findByTestId(
          securityModel === 'api' ? 'setupTrustApiMode' : 'setupTrustCertMode'
        )
      );
      await user.click(screen.getByTestId('remoteClusterTrustNextButton'));
      await screen.findByTestId('remoteClusterFormNextButton');

      return renderResult;
    };

    test('should have a toggle to Skip unavailable remote cluster', async () => {
      const { user } = await goToFormStep({ securityModel: 'api' });

      const toggle = screen.getByTestId('remoteClusterFormSkipUnavailableFormToggle');
      expect(toggle).toBeInTheDocument();
      expect(toggle).toHaveAttribute('aria-checked', 'true');

      await user.click(toggle);
      expect(toggle).toHaveAttribute('aria-checked', 'false');
    });

    test('back button goes to first step', async () => {
      const { user } = await goToFormStep({ securityModel: 'api' });
      await user.click(screen.getByTestId('remoteClusterFormBackButton'));
      expect(await screen.findByTestId('remoteClusterTrustNextButton')).toBeInTheDocument();
    });

    describe('on prem', () => {
      test('should have a toggle to enable "proxy" mode for a remote cluster', async () => {
        const { user } = await goToFormStep({ securityModel: 'api' });

        const toggle = screen.getByTestId('remoteClusterFormConnectionModeToggle');
        expect(toggle).toBeInTheDocument();
        expect(toggle).toHaveAttribute('aria-checked', 'false');

        await user.click(toggle);
        expect(toggle).toHaveAttribute('aria-checked', 'true');
      });

      test('server name has optional label', async () => {
        const { user } = await goToFormStep({ securityModel: 'api' });

        await user.click(screen.getByTestId('remoteClusterFormConnectionModeToggle'));

        const row = screen.getByTestId('remoteClusterFormServerNameFormRow');
        expect(within(row).getByText('Server name (optional)')).toBeInTheDocument();
      });

      test('should display errors and disable the next button when clicking "next" without filling the form', async () => {
        const { user } = await goToFormStep({ securityModel: 'api' });

        const nameInput = screen.getByTestId('remoteClusterFormNameInput');
        await user.clear(nameInput);

        const nextButton = screen.getByTestId('remoteClusterFormNextButton');
        expect(nextButton).toBeEnabled();

        await user.click(nextButton);

        expect(await screen.findByTestId('remoteClusterFormGlobalError')).toBeInTheDocument();
        expect(screen.getByText('Name is required.')).toBeInTheDocument();
        expect(screen.getByText('At least one seed node is required.')).toBeInTheDocument();
        expect(screen.getByTestId('remoteClusterFormNextButton')).toBeDisabled();
      });

      test('renders no switch for cloud advanced options', async () => {
        await goToFormStep({ securityModel: 'api' });
        expect(
          screen.queryByTestId('remoteClusterFormCloudAdvancedOptionsToggle')
        ).not.toBeInTheDocument();
      });

      describe('seeds', () => {
        test('should only allow hostname, ipv4 and ipv6 format in the node "host" part', async () => {
          const { user } = await goToFormStep({ securityModel: 'api' });
          await user.click(screen.getByTestId('remoteClusterFormNextButton')); // show errors

          const invalidSeedMessage =
            /Seed node must use host:port format\..*Hosts can only consist of letters, numbers, and dashes\./;

          // Representative invalid characters (full matrix covered by unit tests in validators).
          const seedsContainer = screen.getByTestId('remoteClusterFormSeedsInput');
          const seedsInput = within(seedsContainer).getByRole('combobox') as HTMLInputElement;

          for (const char of ['#', 'é', '+']) {
            // Clear between iterations so the assertions can't pass due to the previous attempt.
            fireEvent.change(seedsInput, { target: { value: '' } });

            const value = `192.16${char}:3000`;
            fireEvent.change(seedsInput, { target: { value } });
            expect(seedsInput.value).toBe(value);
            fireEvent.keyDown(seedsInput, { key: 'Enter' });

            await waitFor(() => {
              expect(screen.getByText(invalidSeedMessage)).toBeInTheDocument();
            });
          }
        }, 20000);

        test('should require a numeric "port" to be set', async () => {
          const { user } = await goToFormStep({ securityModel: 'api' });
          await user.click(screen.getByTestId('remoteClusterFormNextButton'));

          const seedsContainer = screen.getByTestId('remoteClusterFormSeedsInput');
          const seedsInput = within(seedsContainer).getByRole('combobox') as HTMLInputElement;

          fireEvent.change(seedsInput, { target: { value: '192.168.1.1' } });
          expect(seedsInput.value).toBe('192.168.1.1');
          fireEvent.keyDown(seedsInput, { key: 'Enter' });
          await waitFor(() => expect(screen.getByText('A port is required.')).toBeInTheDocument());

          // Clear between attempts so we don't rely on the previous error state.
          fireEvent.change(seedsInput, { target: { value: '' } });

          fireEvent.change(seedsInput, { target: { value: '192.168.1.1:abc' } });
          expect(seedsInput.value).toBe('192.168.1.1:abc');
          fireEvent.keyDown(seedsInput, { key: 'Enter' });
          await waitFor(() => expect(screen.getByText('A port is required.')).toBeInTheDocument());
        }, 20000);
      });

      describe('node connections', () => {
        test('should require a valid number of node connections', async () => {
          const { user } = await goToFormStep({ securityModel: 'api' });
          await user.click(screen.getByTestId('remoteClusterFormNextButton'));

          const input = screen.getByTestId('remoteClusterFormNodeConnectionsInput');
          fireEvent.change(input, { target: { value: String(MAX_NODE_CONNECTIONS + 1) } });

          await waitFor(() => {
            expect(
              screen.getByText(`This number must be equal or less than ${MAX_NODE_CONNECTIONS}.`)
            ).toBeInTheDocument();
          });
        });
      });

      test('server name is optional (proxy connection)', async () => {
        const { user } = await goToFormStep({ securityModel: 'api' });

        await user.click(screen.getByTestId('remoteClusterFormConnectionModeToggle'));
        await user.click(screen.getByTestId('remoteClusterFormNextButton'));

        expect(screen.getByText('A proxy address is required.')).toBeInTheDocument();
      });
    });

    describe('on cloud', () => {
      test('advanced options are initially disabled', async () => {
        await goToFormStep({ securityModel: 'api', context: { isCloudEnabled: true } });
        const toggle = screen.getByTestId('remoteClusterFormCloudAdvancedOptionsToggle');
        expect(toggle).toHaveAttribute('aria-checked', 'false');
      });

      test('TLS server name has optional label', async () => {
        const { user } = await goToFormStep({
          securityModel: 'api',
          context: { isCloudEnabled: true },
        });

        await user.click(screen.getByTestId('remoteClusterFormCloudAdvancedOptionsToggle'));

        const row = screen.getByTestId('remoteClusterFormTLSServerNameFormRow');
        expect(within(row).getByText('TLS server name (optional)')).toBeInTheDocument();
      });

      test('renders a switch for advanced options', async () => {
        await goToFormStep({ securityModel: 'api', context: { isCloudEnabled: true } });
        expect(
          screen.getByTestId('remoteClusterFormCloudAdvancedOptionsToggle')
        ).toBeInTheDocument();
      });

      test('renders no switch between sniff and proxy modes', async () => {
        await goToFormStep({ securityModel: 'api', context: { isCloudEnabled: true } });
        expect(
          screen.queryByTestId('remoteClusterFormConnectionModeToggle')
        ).not.toBeInTheDocument();
      });

      test('remote address is required', async () => {
        const { user } = await goToFormStep({
          securityModel: 'api',
          context: { isCloudEnabled: true },
        });
        await user.click(screen.getByTestId('remoteClusterFormNextButton'));
        expect(screen.getByText('A remote address is required.')).toBeInTheDocument();
      });

      test('should only allow alpha-numeric characters and "-" (dash) in the remote address "host" part', async () => {
        const { user } = await goToFormStep({
          securityModel: 'api',
          context: { isCloudEnabled: true },
        });
        await user.click(screen.getByTestId('remoteClusterFormNextButton')); // show errors

        const remoteAddressInput = screen.getByTestId('remoteClusterFormRemoteAddressInput');
        // Representative invalid characters (full matrix covered by unit tests in validators).
        for (const char of ['#', 'é', '+']) {
          fireEvent.change(remoteAddressInput, { target: { value: `192.16${char}:3000` } });
          expect(screen.getByText('Remote address is invalid.')).toBeInTheDocument();
        }
      });
    });

    describe('form validation', () => {
      test('should not allow spaces', async () => {
        await goToFormStep({ securityModel: 'api' });

        const nameInput = screen.getByTestId('remoteClusterFormNameInput');
        fireEvent.change(nameInput, { target: { value: 'with space' } });

        fireEvent.click(screen.getByTestId('remoteClusterFormNextButton'));

        expect(screen.getByText('Spaces are not allowed in the name.')).toBeInTheDocument();
      });

      test('should only allow alpha-numeric characters, "-" (dash) and "_" (underscore)', async () => {
        const { user } = await goToFormStep({ securityModel: 'api' });
        await user.click(screen.getByTestId('remoteClusterFormNextButton')); // show errors

        const nameInput = screen.getByTestId('remoteClusterFormNameInput');
        // Representative invalid characters (full matrix covered by unit tests in validators).
        for (const char of ['#', 'é', '+']) {
          fireEvent.change(nameInput, { target: { value: `with${char}` } });

          expect(screen.getByText(/Remove the character/)).toBeInTheDocument();
          expect(screen.getByText(char)).toBeInTheDocument();
          expect(screen.getByText(/from the name\./)).toBeInTheDocument();
        }
      });

      test('should only allow alpha-numeric characters and "-" (dash) in the proxy address "host" part', async () => {
        const { user } = await goToFormStep({ securityModel: 'api' });
        await user.click(screen.getByTestId('remoteClusterFormConnectionModeToggle'));
        await user.click(screen.getByTestId('remoteClusterFormNextButton')); // show errors

        const proxyAddressInput = screen.getByTestId('remoteClusterFormProxyAddressInput');
        // Representative invalid characters (full matrix covered by unit tests in validators).
        for (const char of ['#', 'é', '+']) {
          fireEvent.change(proxyAddressInput, { target: { value: `192.16${char}:3000` } });
          expect(
            screen.getByText(
              /Address must use host:port format\..*Hosts can only consist of letters, numbers, and dashes\./
            )
          ).toBeInTheDocument();
        }
      });

      test('should require a numeric "port" to be set', async () => {
        const { user } = await goToFormStep({ securityModel: 'api' });
        await user.click(screen.getByTestId('remoteClusterFormConnectionModeToggle'));
        await user.click(screen.getByTestId('remoteClusterFormNextButton')); // show errors

        const proxyAddressInput = screen.getByTestId('remoteClusterFormProxyAddressInput');

        fireEvent.change(proxyAddressInput, { target: { value: '192.168.1.1' } });
        expect(screen.getByText('A port is required.')).toBeInTheDocument();

        fireEvent.change(proxyAddressInput, { target: { value: '192.168.1.1:abc' } });
        expect(screen.getByText('A port is required.')).toBeInTheDocument();
      });
    });
  });

  describe('Review step', () => {
    const goToReviewStep = async (options: {
      isCloud?: boolean;
      securityModel: 'api' | 'cert';
    }) => {
      const { isCloud = false, securityModel } = options;
      const { user } = renderAdd({ isCloudEnabled: isCloud });

      await user.click(
        await screen.findByTestId(
          securityModel === 'api' ? 'setupTrustApiMode' : 'setupTrustCertMode'
        )
      );
      await user.click(screen.getByTestId('remoteClusterTrustNextButton'));
      await screen.findByTestId('remoteClusterFormNextButton');

      const nameInput = screen.getByTestId('remoteClusterFormNameInput');
      fireEvent.change(nameInput, {
        target: {
          value: securityModel === 'api' ? 'remote_cluster_apiKey' : 'remote_cluster_cert',
        },
      });

      if (isCloud) {
        const remoteAddressInput = screen.getByTestId('remoteClusterFormRemoteAddressInput');
        fireEvent.change(remoteAddressInput, { target: { value: '1:1' } });
      } else {
        const seedsInput = new EuiComboBoxTestHarness('remoteClusterFormSeedsInput');
        seedsInput.addCustomValue('1:1');
      }

      await user.click(screen.getByTestId('remoteClusterFormNextButton'));

      // Review step renders content based on cloud/onPrem.
      if (isCloud) {
        await screen.findByTestId(
          securityModel === 'api' ? 'cloudApiKeySteps' : 'cloudCertDocumentation'
        );
      } else {
        await screen.findByTestId('remoteClusterReviewOnPremSteps');
      }

      return { user };
    };

    describe('on cloud', () => {
      test('back button goes to second step', async () => {
        const { user } = await goToReviewStep({ isCloud: true, securityModel: 'api' });
        await user.click(screen.getByTestId('remoteClusterReviewtBackButton'));
        expect(await screen.findByTestId('remoteClusterFormNextButton')).toBeInTheDocument();
      });

      test('shows expected documentation when api_key is selected', async () => {
        await goToReviewStep({ isCloud: true, securityModel: 'api' });
        expect(screen.getByTestId('cloudApiKeySteps')).toBeInTheDocument();
        expect(screen.queryByTestId('cloudCertDocumentation')).not.toBeInTheDocument();
      });

      test('shows expected documentation when cert is selected', async () => {
        await goToReviewStep({ isCloud: true, securityModel: 'cert' });
        expect(screen.getByTestId('cloudCertDocumentation')).toBeInTheDocument();
        expect(screen.queryByTestId('cloudApiKeySteps')).not.toBeInTheDocument();
      });
    });

    describe('on prem', () => {
      test('shows expected documentation when api_key is selected', async () => {
        await goToReviewStep({ isCloud: false, securityModel: 'api' });

        expect(screen.getByTestId('remoteClusterReviewOnPremStep1')).toHaveAttribute(
          'href',
          onPremPrerequisitesApiKey
        );
        expect(screen.getByTestId('remoteClusterReviewOnPremStep2')).toHaveAttribute(
          'href',
          onPremSecurityApiKey
        );
      }, 20000);

      test('shows expected documentation when cert is selected', async () => {
        await goToReviewStep({ isCloud: false, securityModel: 'cert' });

        expect(screen.getByTestId('remoteClusterReviewOnPremStep1')).toHaveAttribute(
          'href',
          onPremPrerequisitesCert
        );
        expect(screen.getByTestId('remoteClusterReviewOnPremStep2')).toHaveAttribute(
          'href',
          onPremSecurityCert
        );
      }, 20000);
    });
  });
});
