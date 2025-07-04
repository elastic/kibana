/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestBed } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
export interface RemoteClustersActions {
  docsButtonExists: () => boolean;
  pageTitle: {
    exists: () => boolean;
    text: () => string;
  };
  formStep: {
    nameInput: {
      setValue: (name: string) => void;
      getValue: () => string;
      isDisabled: () => boolean;
    };
    skipUnavailableSwitch: {
      exists: () => boolean;
      toggle: () => void;
      isChecked: () => boolean;
    };
    connectionModeSwitch: {
      exists: () => boolean;
      toggle: () => void;
      isChecked: () => boolean;
    };
    cloudAdvancedOptionsSwitch: {
      toggle: () => void;
      exists: () => boolean;
      isChecked: () => boolean;
    };
    cloudRemoteAddressInput: {
      exists: () => boolean;
      getValue: () => string;
      setValue: (remoteAddress: string) => void;
    };
    seedsInput: {
      setValue: (seed: string) => void;
      getValue: () => string;
    };
    nodeConnectionsInput: {
      setValue: (connections: string) => void;
    };
    proxyAddressInput: {
      setValue: (proxyAddress: string) => void;
      exists: () => boolean;
    };
    serverNameInput: {
      getLabel: () => string;
      exists: () => boolean;
    };
    tlsServerNameInput: {
      getLabel: () => string;
      exists: () => boolean;
    };
    button: {
      click: () => void;
      isDisabled: () => boolean;
    };
    backButton: {
      click: () => void;
    };
    isOnFormStep: () => boolean;
  };

  setupTrustStep: {
    apiCardExist: () => boolean;
    certCardExist: () => boolean;
    selectApiKeyTrustMode: () => void;
    selectCertificatesTrustMode: () => void;
    button: {
      click: () => void;
      isDisabled: () => boolean;
    };
    isOnTrustStep: () => boolean;
  };

  reviewStep: {
    onPrem: {
      exists: () => boolean;
      step1LinkExists: () => boolean;
      step2LinkExists: () => boolean;
      step1Link: () => string;
      step2Link: () => string;
    };
    cloud: {
      apiKeyDocumentationExists: () => boolean;
      certDocumentationExists: () => boolean;
    };
    clickAddCluster: () => void;
    errorBannerExists: () => boolean;
    backButton: {
      click: () => void;
    };
  };

  getErrorMessages: () => string[];
  globalErrorExists: () => boolean;
}
export const createRemoteClustersActions = (testBed: TestBed): RemoteClustersActions => {
  const { form, exists, find, component } = testBed;

  const click = (selector: string) => {
    act(() => {
      find(selector).simulate('click');
    });

    component.update();
  };

  const docsButtonExists = () => exists('remoteClusterDocsButton');

  const createPageTitleActions = () => {
    const pageTitleSelector = 'remoteClusterPageTitle';
    return {
      pageTitle: {
        exists: () => exists(pageTitleSelector),
        text: () => find(pageTitleSelector).text(),
      },
    };
  };

  const formStepActions = () => {
    const createNameInputActions = () => {
      const nameInputSelector = 'remoteClusterFormNameInput';
      return {
        nameInput: {
          setValue: (name: string) => form.setInputValue(nameInputSelector, name),
          getValue: () => find(nameInputSelector).props().value,
          isDisabled: () => find(nameInputSelector).props().disabled,
        },
      };
    };

    const createSkipUnavailableActions = () => {
      const skipUnavailableToggleSelector = 'remoteClusterFormSkipUnavailableFormToggle';
      return {
        skipUnavailableSwitch: {
          exists: () => exists(skipUnavailableToggleSelector),
          toggle: () => {
            act(() => {
              form.toggleEuiSwitch(skipUnavailableToggleSelector);
            });
            component.update();
          },
          isChecked: () => find(skipUnavailableToggleSelector).props()['aria-checked'],
        },
      };
    };

    const createConnectionModeActions = () => {
      const connectionModeToggleSelector = 'remoteClusterFormConnectionModeToggle';
      return {
        connectionModeSwitch: {
          exists: () => exists(connectionModeToggleSelector),
          toggle: () => {
            act(() => {
              form.toggleEuiSwitch(connectionModeToggleSelector);
            });
            component.update();
          },
          isChecked: () => find(connectionModeToggleSelector).props()['aria-checked'],
        },
      };
    };

    const createCloudAdvancedOptionsSwitchActions = () => {
      const cloudUrlSelector = 'remoteClusterFormCloudAdvancedOptionsToggle';
      return {
        cloudAdvancedOptionsSwitch: {
          exists: () => exists(cloudUrlSelector),
          toggle: () => {
            act(() => {
              form.toggleEuiSwitch(cloudUrlSelector);
            });
            component.update();
          },
          isChecked: () => find(cloudUrlSelector).props()['aria-checked'],
        },
      };
    };

    const createSeedsInputActions = () => {
      const seedsInputSelector = 'remoteClusterFormSeedsInput';
      return {
        seedsInput: {
          setValue: (seed: string) => form.setComboBoxValue(seedsInputSelector, seed),
          getValue: () => find(seedsInputSelector).text(),
        },
      };
    };

    const createNodeConnectionsInputActions = () => {
      const nodeConnectionsInputSelector = 'remoteClusterFormNodeConnectionsInput';
      return {
        nodeConnectionsInput: {
          setValue: (connections: string) =>
            form.setInputValue(nodeConnectionsInputSelector, connections),
        },
      };
    };

    const createProxyAddressActions = () => {
      const proxyAddressSelector = 'remoteClusterFormProxyAddressInput';
      return {
        proxyAddressInput: {
          setValue: (proxyAddress: string) =>
            form.setInputValue(proxyAddressSelector, proxyAddress),
          exists: () => exists(proxyAddressSelector),
        },
      };
    };

    const formButtonsActions = () => {
      const formButtonSelector = 'remoteClusterFormNextButton';
      return {
        button: {
          click: () => click(formButtonSelector),
          isDisabled: () => find(formButtonSelector).props().disabled,
        },
      };
    };

    const formBackButtonActions = () => {
      return {
        backButton: {
          click: () => click('remoteClusterFormBackButton'),
        },
      };
    };

    const isOnFormStepActions = () => {
      return { isOnFormStep: () => exists('remoteClusterFormNextButton') };
    };

    const createServerNameActions = () => {
      const serverNameSelector = 'remoteClusterFormServerNameFormRow';
      return {
        serverNameInput: {
          getLabel: () => find('remoteClusterFormServerNameFormRow').find('label').text(),
          exists: () => exists(serverNameSelector),
        },
      };
    };

    const createTlsServerNameActions = () => {
      const serverNameSelector = 'remoteClusterFormTLSServerNameFormRow';
      return {
        tlsServerNameInput: {
          getLabel: () => find(serverNameSelector).find('label').text(),
          exists: () => exists(serverNameSelector),
        },
      };
    };

    const createCloudRemoteAddressInputActions = () => {
      const cloudUrlInputSelector = 'remoteClusterFormRemoteAddressInput';
      return {
        cloudRemoteAddressInput: {
          exists: () => exists(cloudUrlInputSelector),
          getValue: () => find(cloudUrlInputSelector).props().value,
          setValue: (remoteAddress: string) =>
            form.setInputValue(cloudUrlInputSelector, remoteAddress),
        },
      };
    };

    return {
      formStep: {
        ...createNameInputActions(),
        ...createSkipUnavailableActions(),
        ...createConnectionModeActions(),
        ...createCloudAdvancedOptionsSwitchActions(),
        ...createSeedsInputActions(),
        ...createNodeConnectionsInputActions(),
        ...createProxyAddressActions(),
        ...formButtonsActions(),
        ...formBackButtonActions(),
        ...isOnFormStepActions(),
        ...createServerNameActions(),
        ...createTlsServerNameActions(),
        ...createCloudRemoteAddressInputActions(),
      },
    };
  };

  const globalErrorExists = () => exists('remoteClusterFormGlobalError');

  const setupTrustStepActions = () => {
    const trustButtonSelector = 'remoteClusterTrustNextButton';
    return {
      setupTrustStep: {
        apiCardExist: () => exists('setupTrustApiMode'),
        certCardExist: () => exists('setupTrustCertMode'),
        selectApiKeyTrustMode: () => click('setupTrustApiMode'),
        selectCertificatesTrustMode: () => click('setupTrustCertMode'),
        button: {
          click: () => click(trustButtonSelector),
          isDisabled: () => find(trustButtonSelector).props().disabled,
        },
        isOnTrustStep: () => exists(trustButtonSelector),
      },
    };
  };

  const reviewStepActions = () => {
    const onPremReviewStepsSelector = 'remoteClusterReviewOnPremSteps';
    const onPremStep1Selector = 'remoteClusterReviewOnPremStep1';
    const onPremStep2Selector = 'remoteClusterReviewOnPremStep2';
    return {
      reviewStep: {
        onPrem: {
          exists: () => exists(onPremReviewStepsSelector),
          step1LinkExists: () => exists(onPremStep1Selector),
          step2LinkExists: () => exists(onPremStep2Selector),
          step1Link: () => find(onPremStep1Selector).props().href,
          step2Link: () => find(onPremStep2Selector).props().href,
        },
        cloud: {
          apiKeyDocumentationExists: () => exists('cloudApiKeySteps'),
          certDocumentationExists: () => exists('cloudCertDocumentation'),
        },
        clickAddCluster: () => click('remoteClusterReviewtNextButton'),
        errorBannerExists: () => exists('saveErrorBanner'),
        backButton: {
          click: () => click('remoteClusterReviewtBackButton'),
        },
      },
    };
  };

  return {
    docsButtonExists,
    ...createPageTitleActions(),
    ...formStepActions(),
    ...setupTrustStepActions(),
    ...reviewStepActions(),
    getErrorMessages: form.getErrorsMessages,
    globalErrorExists,
  };
};
