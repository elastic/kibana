/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import type { ILicense, LicenseType } from '@kbn/licensing-types';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import { PLUGIN_ID } from '../common';
import { DataFederationPlugin } from './plugin';

const createLicense = (type: LicenseType) => licensingMock.createLicense({ license: { type } });

const setup = ({
  license,
  canManageFederatedData = true,
}: {
  license: ILicense;
  canManageFederatedData?: boolean;
}) => {
  const app = { enable: jest.fn(), disable: jest.fn() };
  const registerApp = jest.fn().mockReturnValue(app);
  const management = {
    sections: { section: { data: { registerApp } } },
  } as unknown as ManagementSetup;

  const coreStart = coreMock.createStart();
  coreStart.application.capabilities = {
    ...coreStart.application.capabilities,
    [PLUGIN_ID]: { manageFederatedData: canManageFederatedData },
  };

  const license$ = new BehaviorSubject(license);
  const licensing = { ...licensingMock.createStart(), license$ };

  const plugin = new DataFederationPlugin(
    coreMock.createPluginInitializerContext({ enabled: true })
  );
  plugin.setup(coreMock.createSetup(), { management });

  return {
    app,
    registerApp,
    license$,
    start: () => plugin.start(coreStart, { licensing }),
    stop: () => plugin.stop(),
  };
};

describe('DataFederationPlugin', () => {
  it('registers the app disabled during setup', () => {
    const { app, registerApp } = setup({ license: createLicense('enterprise') });

    expect(registerApp).toHaveBeenCalledTimes(1);
    expect(app.disable).toHaveBeenCalled();
    expect(app.enable).not.toHaveBeenCalled();
  });

  it('enables the app with an enterprise license', () => {
    const { app, start } = setup({ license: createLicense('enterprise') });
    start();

    expect(app.enable).toHaveBeenCalled();
  });

  it.each<LicenseType>(['basic', 'gold', 'platinum'])(
    'keeps the app disabled with a %s license',
    (type) => {
      const { app, start } = setup({ license: createLicense(type) });
      start();

      expect(app.enable).not.toHaveBeenCalled();
    }
  );

  it('disables the app when the enterprise license expires', () => {
    const { app, license$, start } = setup({ license: createLicense('enterprise') });
    start();
    app.disable.mockClear();

    license$.next(
      licensingMock.createLicense({ license: { type: 'enterprise', status: 'expired' } })
    );

    expect(app.disable).toHaveBeenCalled();
  });

  it('keeps the app disabled without the manageFederatedData capability', () => {
    const { app, start } = setup({
      license: createLicense('enterprise'),
      canManageFederatedData: false,
    });
    start();

    expect(app.enable).not.toHaveBeenCalled();
  });

  it('enables the app when the license is upgraded to enterprise', () => {
    const { app, license$, start } = setup({ license: createLicense('basic') });
    start();
    expect(app.enable).not.toHaveBeenCalled();

    license$.next(createLicense('enterprise'));

    expect(app.enable).toHaveBeenCalled();
  });

  it('stops reacting to license changes after stop()', () => {
    const { app, license$, start, stop } = setup({ license: createLicense('enterprise') });
    start();
    stop();
    app.enable.mockClear();
    app.disable.mockClear();

    license$.next(createLicense('basic'));
    license$.next(createLicense('enterprise'));

    expect(app.enable).not.toHaveBeenCalled();
    expect(app.disable).not.toHaveBeenCalled();
  });
});
