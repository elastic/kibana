/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { homePluginMock } from '@kbn/home-plugin/public/mocks';
import { managementPluginMock } from '@kbn/management-plugin/public/mocks';
import { CloudConnectedPlugin } from './plugin';

const createPlugin = () =>
  new CloudConnectedPlugin(
    coreMock.createPluginInitializerContext({
      cloudUrl: 'https://cloud.elastic.co',
    })
  );

describe('CloudConnectedPlugin', () => {
  it('provides ECH AutoOps status without registering Cloud Connect or making an API request', () => {
    const plugin = createPlugin();
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    const cloud = cloudMock.createSetup();
    const home = homePluginMock.createSetupContract();
    const management = managementPluginMock.createSetupContract();
    cloud.isEce = false;
    cloud.isServerlessEnabled = false;
    cloud.deploymentUrl = 'https://cloud.elastic.co/deployments/deployment-id';

    plugin.setup(coreSetup, { cloud, home, management });
    const startContract = plugin.start(coreStart);
    const { result } = renderHook(() => startContract.hooks.useCloudConnectStatus());

    expect(coreSetup.application.register).not.toHaveBeenCalled();
    expect(home.addData.registerCloudConnectStatusHook).not.toHaveBeenCalled();
    expect(management.registerAutoOpsStatusHook).toHaveBeenCalledWith(
      startContract.hooks.useCloudConnectStatus
    );
    expect(coreStart.http.get).not.toHaveBeenCalled();
    expect(result.current.isCloudConnectAutoopsEnabled).toBe(true);
    expect(result.current.autoOpsServiceUrl).toBe(
      'https://cloud.elastic.co/deployments/deployment-id'
    );
  });

  it('keeps the API-backed status hook for ECE', () => {
    const plugin = createPlugin();
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    const cloud = cloudMock.createSetup();
    const home = homePluginMock.createSetupContract();
    const management = managementPluginMock.createSetupContract();
    cloud.isEce = true;

    plugin.setup(coreSetup, { cloud, home, management });
    const startContract = plugin.start(coreStart);

    expect(coreSetup.application.register).toHaveBeenCalled();
    expect(home.addData.registerCloudConnectStatusHook).toHaveBeenCalledWith(
      startContract.hooks.useCloudConnectStatus
    );
    expect(management.registerAutoOpsStatusHook).toHaveBeenCalledWith(
      startContract.hooks.useCloudConnectStatus
    );
  });

  it('does not treat serverless as ECH', () => {
    const plugin = createPlugin();
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    const cloud = cloudMock.createSetup();
    const home = homePluginMock.createSetupContract();
    const management = managementPluginMock.createSetupContract();
    cloud.isEce = undefined;
    cloud.isServerlessEnabled = true;

    plugin.setup(coreSetup, { cloud, home, management });
    plugin.start(coreStart);

    expect(coreSetup.application.register).not.toHaveBeenCalled();
    expect(home.addData.registerCloudConnectStatusHook).not.toHaveBeenCalled();
    expect(management.registerAutoOpsStatusHook).not.toHaveBeenCalled();
  });

  it('does not expose a broken AutoOps URL when the ECH deployment URL is absent', () => {
    const plugin = createPlugin();
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    const cloud = cloudMock.createSetup();
    const management = managementPluginMock.createSetupContract();
    cloud.isEce = false;
    cloud.isServerlessEnabled = false;
    cloud.deploymentUrl = undefined;

    plugin.setup(coreSetup, { cloud, management });
    const startContract = plugin.start(coreStart);
    const { result } = renderHook(() => startContract.hooks.useCloudConnectStatus());

    expect(result.current.isCloudConnectAutoopsEnabled).toBe(true);
    expect(result.current.autoOpsServiceUrl).toBeUndefined();
    expect(coreStart.http.get).not.toHaveBeenCalled();
  });
});
