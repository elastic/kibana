/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import '../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../__mocks__';
import React from 'react';

import {
  EuiPopover,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiResizeObserver,
} from '@elastic/eui';

import { IngestionStatus, IngestionMethod, ConnectorStatus } from '@kbn/search-connectors';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { Status } from '../../../../common/types/api';
import { SyncsContextMenu } from './syncs_context_menu';
import { AppContextProvider } from '../../../app_context';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { AppDependencies, SearchConnectorsPluginStartDependencies } from '../../../types';

const appContext: AppDependencies = {
  isAgentlessEnabled: true,
  connectorTypes: [],
  kibanaVersion: '',
  isCloud: false,
  hasPlatinumLicense: false,
  plugins: {} as unknown as SearchConnectorsPluginStartDependencies,
};
jest.mock('@kbn/kibana-react-plugin/public');
const http = httpServiceMock.createSetupContract();

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;
describe('SyncsContextMenu', () => {
  const startSync = jest.fn();
  const startIncrementalSync = jest.fn();
  const startAccessControlSync = jest.fn();
  const cancelSyncs = jest.fn();

  const mockValues = {
    hasDocumentLevelSecurityFeature: false,
    hasIncrementalSyncFeature: false,
    ingestionMethod: IngestionMethod.CONNECTOR,
    ingestionStatus: IngestionStatus.CONNECTED,
    isCanceling: false,
    isSyncing: false,
    isWaitingForSync: false,
    productFeatures: {
      hasDocumentLevelSecurityEnabled: true,
      hasIncrementalSyncEnabled: true,
    },
    status: Status.SUCCESS,
    connector: {
      index_name: 'index_name',
      status: ConnectorStatus.CONFIGURED,
    },
  };

  beforeEach(() => {
    useKibanaMock.mockReturnValue({
      services: {
        http,
      },
      overlays: {
        openFlyout: jest.fn(),
        openModal: jest.fn(),
      },
    });
    setMockValues(mockValues);
    setMockActions({
      cancelSyncs,
      startAccessControlSync,
      startIncrementalSync,
      startSync,
    });
  });

  it('renders', () => {
    setMockValues({ ...mockValues, isWaitingForSync: true });
    const wrapper = mountWithIntl(
      <AppContextProvider value={appContext}>
        <SyncsContextMenu />
      </AppContextProvider>
    );
    const popover = wrapper.find(EuiPopover);

    expect(popover).toHaveLength(1);
    expect(popover.props().isOpen).toEqual(false);
  });

  it('Can cancel syncs', () => {
    setMockValues({ ...mockValues, isSyncing: true });
    const wrapper = mountWithIntl(
      <AppContextProvider value={appContext}>
        <SyncsContextMenu />
      </AppContextProvider>
    );
    const button = wrapper.find(
      'button[data-telemetry-id="entSearchContent-connector-header-sync-openSyncMenu"]'
    );
    button.simulate('click');

    const menuItems = wrapper
      .find(EuiContextMenuPanel)
      .find(EuiResizeObserver)
      .find(EuiContextMenuItem);
    expect(menuItems).toHaveLength(1);

    const lastButton = menuItems.last();

    expect(lastButton.prop('disabled')).toEqual(false);
    expect(lastButton.text()).toEqual('Cancel Syncs');

    menuItems.last().simulate('click');
    expect(cancelSyncs).toHaveBeenCalled();
  });

  it('Can start a sync', () => {
    setMockValues({ ...mockValues, ingestionStatus: IngestionStatus.ERROR });
    const wrapper = mountWithIntl(
      <AppContextProvider value={appContext}>
        <SyncsContextMenu />
      </AppContextProvider>
    );
    const button = wrapper.find(
      'button[data-telemetry-id="entSearchContent-connector-header-sync-openSyncMenu"]'
    );
    button.simulate('click');

    const menuItems = wrapper
      .find(EuiContextMenuPanel)
      .find(EuiResizeObserver)
      .find(EuiContextMenuItem);
    expect(menuItems).toHaveLength(2);

    const firstButton = menuItems.get(0);

    expect(firstButton.props).toEqual(
      expect.objectContaining({
        children: 'Full Content',
        disabled: false,
      })
    );
    menuItems.at(0).simulate('click');
    expect(startSync).toHaveBeenCalled();
  });

  it('Cannot start a sync without an index name', () => {
    setMockValues({
      ...mockValues,
      connector: { index_name: null, status: ConnectorStatus.CONFIGURED },
    });
    const wrapper = mountWithIntl(
      <AppContextProvider value={appContext}>
        <SyncsContextMenu />
      </AppContextProvider>
    );
    const button = wrapper.find(
      'button[data-telemetry-id="entSearchContent-connector-header-sync-openSyncMenu"]'
    );
    button.simulate('click');

    const menuItems = wrapper
      .find(EuiContextMenuPanel)
      .find(EuiResizeObserver)
      .find(EuiContextMenuItem);
    expect(menuItems).toHaveLength(2);

    const firstButton = menuItems.get(0);

    expect(firstButton.props).toEqual(
      expect.objectContaining({
        children: 'Full Content',
        disabled: true,
      })
    );
  });

  it("Sync button is disabled when connector isn't configured", () => {
    setMockValues({ ...mockValues, connector: { status: null } });
    const wrapper = mountWithIntl(
      <AppContextProvider value={appContext}>
        <SyncsContextMenu />
      </AppContextProvider>
    );
    const button = wrapper.find(
      'button[data-telemetry-id="entSearchContent-connector-header-sync-openSyncMenu"]'
    );
    expect(button.prop('disabled')).toEqual(true);
  });
});
