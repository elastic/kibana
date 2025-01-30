/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestBed } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';

import { setupEnvironment, RemoteClustersActions } from '../helpers';
import { setup } from './remote_clusters_add.helpers';
import { NON_ALPHA_NUMERIC_CHARS, ACCENTED_CHARS } from './special_characters';
import { MAX_NODE_CONNECTIONS } from '../../../common/constants';
import {
  onPremPrerequisitesApiKey,
  onPremPrerequisitesCert,
  onPremSecurityApiKey,
  onPremSecurityCert,
} from '../../../public/application/services/documentation';

const notInArray = (array: string[]) => (value: string) => array.indexOf(value) < 0;

let component: TestBed['component'];
let actions: RemoteClustersActions;

describe('Create Remote cluster', () => {
  const { httpSetup } = setupEnvironment();

  beforeEach(async () => {
    await act(async () => {
      ({ actions, component } = await setup(httpSetup));
    });
    component.update();
  });

  describe('on component mount', () => {
    test('should have the title of the page set correctly', () => {
      expect(actions.pageTitle.exists()).toBe(true);
      expect(actions.pageTitle.text()).toEqual('Add remote cluster');
    });

    test('should have a link to the documentation', () => {
      expect(actions.docsButtonExists()).toBe(true);
    });

    describe('Setup Trust', () => {
      test('should contain two cards for setting up trust', () => {
        // Cards exist
        expect(actions.setupTrustStep.apiCardExist()).toBe(true);
        expect(actions.setupTrustStep.certCardExist()).toBe(true);
      });

      test('next button should be disabled if not trust mode selected', async () => {
        expect(actions.setupTrustStep.button.isDisabled()).toBe(true);
      });

      test('next button should be enabled if trust mode selected', async () => {
        await actions.setupTrustStep.selectApiKeyTrustMode();
        expect(actions.setupTrustStep.button.isDisabled()).toBe(false);
      });

      test('shows only cert based config if API key trust model is not available', async () => {
        await act(async () => {
          ({ actions, component } = await setup(httpSetup, {
            canUseAPIKeyTrustModel: false,
          }));
        });

        expect(actions.setupTrustStep.apiCardExist()).toBe(false);
        expect(actions.setupTrustStep.certCardExist()).toBe(true);
      });
    });

    describe('Form step', () => {
      beforeEach(async () => {
        await act(async () => {
          ({ actions, component } = await setup(httpSetup, {
            canUseAPIKeyTrustModel: true,
          }));
        });

        component.update();

        await actions.setupTrustStep.selectApiKeyTrustMode();
        await actions.setupTrustStep.button.click();
      });

      test('should have a toggle to Skip unavailable remote cluster', () => {
        expect(actions.formStep.skipUnavailableSwitch.exists()).toBe(true);

        // By default it should be set to "true"
        expect(actions.formStep.skipUnavailableSwitch.isChecked()).toBe(true);

        actions.formStep.skipUnavailableSwitch.toggle();

        expect(actions.formStep.skipUnavailableSwitch.isChecked()).toBe(false);
      });

      test('back button goes to first step', async () => {
        await actions.formStep.backButton.click();
        expect(actions.setupTrustStep.isOnTrustStep()).toBe(true);
      });

      describe('on prem', () => {
        beforeEach(async () => {
          await act(async () => {
            ({ actions, component } = await setup(httpSetup));
          });

          component.update();

          actions.formStep.nameInput.setValue('remote_cluster_test');
        });

        test('should have a toggle to enable "proxy" mode for a remote cluster', () => {
          expect(actions.formStep.connectionModeSwitch.exists()).toBe(true);

          // By default it should be set to "false"
          expect(actions.formStep.connectionModeSwitch.isChecked()).toBe(false);

          actions.formStep.connectionModeSwitch.toggle();

          expect(actions.formStep.connectionModeSwitch.isChecked()).toBe(true);
        });

        test('server name has optional label', () => {
          actions.formStep.connectionModeSwitch.toggle();
          expect(actions.formStep.serverNameInput.getLabel()).toBe('Server name (optional)');
        });

        test('should display errors and disable the next button when clicking "next" without filling the form', async () => {
          actions.formStep.nameInput.setValue('');
          expect(actions.globalErrorExists()).toBe(false);
          expect(actions.formStep.button.isDisabled()).toBe(false);

          await actions.formStep.button.click();

          expect(actions.globalErrorExists()).toBe(true);
          expect(actions.getErrorMessages()).toEqual([
            'Name is required.',
            // seeds input is switched on by default on prem and is required
            'At least one seed node is required.',
          ]);
          expect(actions.formStep.button.isDisabled()).toBe(true);
        });

        test('renders no switch for cloud advanced options', () => {
          expect(actions.formStep.cloudAdvancedOptionsSwitch.exists()).toBe(false);
        });

        describe('seeds', () => {
          test('should only allow alpha-numeric characters and "-" (dash) in the node "host" part', async () => {
            await actions.formStep.button.click(); // display form errors

            const expectInvalidChar = (char: string) => {
              actions.formStep.seedsInput.setValue(`192.16${char}:3000`);
              expect(actions.getErrorMessages()).toContain(
                `Seed node must use host:port format. Example: 127.0.0.1:9400, localhost:9400. Hosts can only consist of letters, numbers, and dashes.`
              );
            };

            [...NON_ALPHA_NUMERIC_CHARS, ...ACCENTED_CHARS]
              .filter(notInArray(['-', '_', ':']))
              .forEach(expectInvalidChar);
          });

          test('should require a numeric "port" to be set', async () => {
            await actions.formStep.button.click();

            actions.formStep.seedsInput.setValue('192.168.1.1');
            expect(actions.getErrorMessages()).toContain('A port is required.');

            actions.formStep.seedsInput.setValue('192.168.1.1:abc');
            expect(actions.getErrorMessages()).toContain('A port is required.');
          });
        });

        describe('node connections', () => {
          test('should require a valid number of node connections', async () => {
            await actions.formStep.button.click();

            actions.formStep.nodeConnectionsInput.setValue(String(MAX_NODE_CONNECTIONS + 1));
            expect(actions.getErrorMessages()).toContain(
              `This number must be equal or less than ${MAX_NODE_CONNECTIONS}.`
            );
          });
        });

        test('server name is optional (proxy connection)', () => {
          actions.formStep.connectionModeSwitch.toggle();
          actions.formStep.button.click();
          expect(actions.getErrorMessages()).toEqual(['A proxy address is required.']);
        });
      });

      describe('on cloud', () => {
        beforeEach(async () => {
          await act(async () => {
            ({ actions, component } = await setup(httpSetup, { isCloudEnabled: true }));
          });

          component.update();
        });

        test('TLS server name has optional label', () => {
          actions.formStep.cloudAdvancedOptionsSwitch.toggle();
          expect(actions.formStep.tlsServerNameInput.getLabel()).toBe('TLS server name (optional)');
        });

        test('renders a switch for advanced options', () => {
          expect(actions.formStep.cloudAdvancedOptionsSwitch.exists()).toBe(true);
        });

        test('renders no switch between sniff and proxy modes', () => {
          expect(actions.formStep.connectionModeSwitch.exists()).toBe(false);
        });

        test('advanced options are initially disabled', () => {
          expect(actions.formStep.cloudAdvancedOptionsSwitch.isChecked()).toBe(false);
        });

        test('remote address is required', () => {
          actions.formStep.button.click();
          expect(actions.getErrorMessages()).toContain('A remote address is required.');
        });

        test('should only allow alpha-numeric characters and "-" (dash) in the remote address "host" part', async () => {
          await actions.formStep.button.click(); // display form errors

          const expectInvalidChar = (char: string) => {
            actions.formStep.cloudRemoteAddressInput.setValue(`192.16${char}:3000`);
            expect(actions.getErrorMessages()).toContain('Remote address is invalid.');
          };

          [...NON_ALPHA_NUMERIC_CHARS, ...ACCENTED_CHARS]
            .filter(notInArray(['-', '_', ':']))
            .forEach(expectInvalidChar);
        });
      });
      describe('form validation', () => {
        describe('remote cluster name', () => {
          test('should not allow spaces', async () => {
            actions.formStep.nameInput.setValue('with space');

            await actions.formStep.button.click();

            expect(actions.getErrorMessages()).toContain('Spaces are not allowed in the name.');
          });

          test('should only allow alpha-numeric characters, "-" (dash) and "_" (underscore)', async () => {
            const expectInvalidChar = (char: string) => {
              if (char === '-' || char === '_') {
                return;
              }

              try {
                actions.formStep.nameInput.setValue(`with${char}`);

                expect(actions.getErrorMessages()).toContain(
                  `Remove the character ${char} from the name.`
                );
              } catch {
                throw Error(`Char "${char}" expected invalid but was allowed`);
              }
            };

            await actions.formStep.button.click(); // display form errors

            [...NON_ALPHA_NUMERIC_CHARS, ...ACCENTED_CHARS].forEach(expectInvalidChar);
          });
        });

        describe('proxy address', () => {
          beforeEach(async () => {
            await act(async () => {
              ({ actions, component } = await setup(httpSetup));
            });

            component.update();

            actions.formStep.connectionModeSwitch.toggle();
          });

          test('should only allow alpha-numeric characters and "-" (dash) in the proxy address "host" part', async () => {
            await actions.formStep.button.click(); // display form errors

            const expectInvalidChar = (char: string) => {
              actions.formStep.proxyAddressInput.setValue(`192.16${char}:3000`);
              expect(actions.getErrorMessages()).toContain(
                'Address must use host:port format. Example: 127.0.0.1:9400, localhost:9400. Hosts can only consist of letters, numbers, and dashes.'
              );
            };

            [...NON_ALPHA_NUMERIC_CHARS, ...ACCENTED_CHARS]
              .filter(notInArray(['-', '_', ':']))
              .forEach(expectInvalidChar);
          });

          test('should require a numeric "port" to be set', async () => {
            await actions.formStep.button.click();

            actions.formStep.proxyAddressInput.setValue('192.168.1.1');
            expect(actions.getErrorMessages()).toContain('A port is required.');

            actions.formStep.proxyAddressInput.setValue('192.168.1.1:abc');
            expect(actions.getErrorMessages()).toContain('A port is required.');
          });
        });
      });
    });

    describe('Review step', () => {
      describe('on cloud', () => {
        beforeEach(async () => {
          await act(async () => {
            ({ actions, component } = await setup(httpSetup, { isCloudEnabled: true }));
          });

          component.update();
        });

        test('back button goes to second step', async () => {
          await actions.setupTrustStep.selectApiKeyTrustMode();
          await actions.setupTrustStep.button.click();

          await actions.formStep.nameInput.setValue('remote_cluster_apiKey_cloud');
          await actions.formStep.cloudRemoteAddressInput.setValue('1:1');
          await actions.formStep.button.click();

          await actions.reviewStep.backButton.click();
          expect(actions.formStep.isOnFormStep()).toBe(true);
        });

        test('shows expected documentation when api_key is selected', async () => {
          await actions.setupTrustStep.selectApiKeyTrustMode();
          await actions.setupTrustStep.button.click();

          await actions.formStep.nameInput.setValue('remote_cluster_apiKey_cloud');
          await actions.formStep.cloudRemoteAddressInput.setValue('1:1');
          await actions.formStep.button.click();

          expect(actions.reviewStep.cloud.apiKeyDocumentationExists()).toBe(true);
          expect(actions.reviewStep.cloud.certDocumentationExists()).toBe(false);
        });

        test('shows expected documentation when cert is selected', async () => {
          await actions.setupTrustStep.selectCertificatesTrustMode();
          await actions.setupTrustStep.button.click();

          await actions.formStep.nameInput.setValue('remote_cluster_cert_cloud');
          await actions.formStep.cloudRemoteAddressInput.setValue('1:1');
          await actions.formStep.button.click();

          expect(actions.reviewStep.cloud.certDocumentationExists()).toBe(true);
          expect(actions.reviewStep.cloud.apiKeyDocumentationExists()).toBe(false);
        });
      });
      describe('on prem', () => {
        beforeEach(async () => {
          await act(async () => {
            ({ actions, component } = await setup(httpSetup));
          });

          component.update();
        });

        test('shows expected documentation when api_key is selected', async () => {
          const open = jest.fn();
          global.open = open;

          await actions.setupTrustStep.selectApiKeyTrustMode();
          await actions.setupTrustStep.button.click();

          await actions.formStep.nameInput.setValue('remote_cluster_apiKey_onPrem');
          await actions.formStep.seedsInput.setValue('1:1');
          await actions.formStep.button.click();

          expect(actions.reviewStep.onPrem.step1LinkExists()).toBe(true);
          expect(actions.reviewStep.onPrem.step1Link()).toBe(onPremPrerequisitesApiKey);

          expect(actions.reviewStep.onPrem.step2LinkExists()).toBe(true);
          expect(actions.reviewStep.onPrem.step2Link()).toBe(onPremSecurityApiKey);
        });

        test('shows expected documentation when cert is selected', async () => {
          const open = jest.fn();
          global.open = open;

          await actions.setupTrustStep.selectCertificatesTrustMode;
          await actions.setupTrustStep.button.click();

          await actions.formStep.nameInput.setValue('remote_cluster_cert_onPrem');
          await actions.formStep.seedsInput.setValue('1:1');
          await actions.formStep.button.click();

          expect(actions.reviewStep.onPrem.step1LinkExists()).toBe(true);
          expect(actions.reviewStep.onPrem.step1Link()).toBe(onPremPrerequisitesCert);

          expect(actions.reviewStep.onPrem.step2LinkExists()).toBe(true);
          expect(actions.reviewStep.onPrem.step2Link()).toBe(onPremSecurityCert);
        });
      });
    });
  });
});
