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
  isOnFirstStep: () => boolean;
  saveButton: {
    click: () => void;
    isDisabled: () => boolean;
  };
  setupTrust: {
    isSubmitInConfirmDisabled: () => boolean;
    toggleConfirmSwitch: () => void;
    setupTrustConfirmClick: () => void;
    backToFirstStepClick: () => void;
    apiCardExist: () => boolean;
    certCardExist: () => boolean;
    apiCardDocsExist: () => boolean;
    certCardDocsExist: () => boolean;
  };
  getErrorMessages: () => string[];
  globalErrorExists: () => boolean;
}
export const createRemoteClustersActions = (testBed: TestBed): RemoteClustersActions => {
  const { form, exists, find, component } = testBed;

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
        setValue: (proxyAddress: string) => form.setInputValue(proxyAddressSelector, proxyAddress),
        exists: () => exists(proxyAddressSelector),
      },
    };
  };

  const createSetupTrustActions = () => {
    const click = () => {
      act(() => {
        find('remoteClusterFormSaveButton').simulate('click');
      });

      component.update();
    };
    const isDisabled = () => find('remoteClusterFormSaveButton').props().disabled;

    const setupTrustConfirmClick = () => {
      act(() => {
        find('setupTrustDoneButton').simulate('click');
      });

      component.update();
    };

    const backToFirstStepClick = () => {
      act(() => {
        find('setupTrustBackButton').simulate('click');
      });

      component.update();
    };

    const isOnFirstStep = () => exists('remoteClusterFormNameInput');

    const toggleConfirmSwitch = () => {
      act(() => {
        const $checkbox = find('remoteClusterTrustCheckbox');
        const isChecked = $checkbox.props().checked;
        $checkbox.simulate('change', { target: { checked: !isChecked } });
      });

      component.update();
    };

    const isSubmitInConfirmDisabled = () => find('remoteClusterTrustSubmitButton').props().disabled;

    const apiCardExist = () => exists('setupTrustApiKeyCard');
    const certCardExist = () => exists('setupTrustCertCard');
    const apiCardDocsExist = () => exists('setupTrustApiKeyCardDocs');
    const certCardDocsExist = () => exists('setupTrustCertCardDocs');

    return {
      isOnFirstStep,
      saveButton: { click, isDisabled },
      setupTrust: {
        setupTrustConfirmClick,
        isSubmitInConfirmDisabled,
        toggleConfirmSwitch,
        apiCardExist,
        certCardExist,
        apiCardDocsExist,
        certCardDocsExist,
        backToFirstStepClick,
      },
    };
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

  const globalErrorExists = () => exists('remoteClusterFormGlobalError');

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
    docsButtonExists,
    ...createPageTitleActions(),
    ...createNameInputActions(),
    ...createSkipUnavailableActions(),
    ...createConnectionModeActions(),
    ...createCloudAdvancedOptionsSwitchActions(),
    ...createSeedsInputActions(),
    ...createNodeConnectionsInputActions(),
    ...createCloudRemoteAddressInputActions(),
    ...createProxyAddressActions(),
    ...createServerNameActions(),
    ...createTlsServerNameActions(),
    ...createSetupTrustActions(),
    getErrorMessages: form.getErrorsMessages,
    globalErrorExists,
  };
};
