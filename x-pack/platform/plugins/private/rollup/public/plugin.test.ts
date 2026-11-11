/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppDeepLinkLocations } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { managementPluginMock } from '@kbn/management-plugin/public/mocks';
import type { BehaviorSubject } from 'rxjs';
import { RollupPlugin } from './plugin';

const setupPlugin = (canManageRollups = true) => {
  const plugin = new RollupPlugin(
    coreMock.createPluginInitializerContext({ ui: { enabled: true } })
  );
  const coreSetup = coreMock.createSetup();
  const coreStart = coreMock.createStart();
  coreStart.application.capabilities = {
    ...coreStart.application.capabilities,
    management: { data: { rollup_jobs: canManageRollups } },
  };
  const management = managementPluginMock.createSetupContract();
  const app = { disable: jest.fn() };
  const registerApp = management.sections.section.data.registerApp as jest.Mock;
  registerApp.mockReturnValue(app);

  plugin.setup(coreSetup, {
    management,
    dataViews: dataViewPluginMocks.createSetupContract(),
  });

  const visibleIn$ = registerApp.mock.calls[0][0].visibleIn$ as BehaviorSubject<
    AppDeepLinkLocations[]
  >;
  return { plugin, coreStart, app, visibleIn$ };
};

describe('RollupPlugin management app', () => {
  it('hides the app when the cluster has no rollup jobs', async () => {
    const { plugin, coreStart, app, visibleIn$ } = setupPlugin();
    coreStart.http.get.mockResolvedValue({ jobs: [] });

    plugin.start(coreStart);
    await coreStart.http.get.mock.results[0].value;

    expect(coreStart.http.get).toHaveBeenCalledWith('/api/rollup/jobs');
    expect(app.disable).toHaveBeenCalledTimes(1);
    expect(visibleIn$.getValue()).toEqual([]);
  });

  it('keeps the app available when rollup jobs exist', async () => {
    const { plugin, coreStart, app, visibleIn$ } = setupPlugin();
    coreStart.http.get.mockResolvedValue({ jobs: [{ id: 'existing-job' }] });

    plugin.start(coreStart);
    await coreStart.http.get.mock.results[0].value;

    expect(app.disable).not.toHaveBeenCalled();
    expect(visibleIn$.getValue()).toEqual(['globalSearch', 'projectSideNav']);
  });

  it('does not request jobs without the rollup management privilege', () => {
    const { plugin, coreStart } = setupPlugin(false);

    plugin.start(coreStart);

    expect(coreStart.http.get).not.toHaveBeenCalled();
  });

  it('keeps the app available when the jobs request fails', async () => {
    const { plugin, coreStart, app, visibleIn$ } = setupPlugin();
    coreStart.http.get.mockRejectedValue(new Error('Request failed'));

    plugin.start(coreStart);
    await coreStart.http.get.mock.results[0].value.catch(() => {});

    expect(app.disable).not.toHaveBeenCalled();
    expect(visibleIn$.getValue()).toEqual(['globalSearch', 'projectSideNav']);
  });
});
