/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { DEFAULT_PROTOTYPE_SETTINGS } from '../../common/prototype_settings';
import type { PrototypeSettings } from '../../common/prototype_settings';

type PrototypeSettingsModule = typeof import('./prototype_settings');

// The settings live in the module, so each test loads its own copy.
const loadModule = (): PrototypeSettingsModule => {
  let module: PrototypeSettingsModule | undefined;
  jest.isolateModules(() => {
    module = jest.requireActual<PrototypeSettingsModule>('./prototype_settings');
  });
  if (!module) {
    throw new Error('prototype_settings did not load');
  }
  return module;
};

const createHttp = (saved: PrototypeSettings) => {
  const get = jest.fn().mockResolvedValue(saved);
  const put = jest.fn(async (_path: string, { body }: { body: string }) => ({
    ...saved,
    ...JSON.parse(body),
  }));
  return { http: { get, put } as unknown as HttpStart, get, put };
};

describe('prototype settings', () => {
  it('are off until the shared settings load, and load once', async () => {
    const { loadPrototypeSettings, getPrototypeSettings } = loadModule();
    const { http, get } = createHttp({ shows_estimates: true, allows_multiple_targets: true });
    expect(getPrototypeSettings()).toEqual(DEFAULT_PROTOTYPE_SETTINGS);

    void loadPrototypeSettings(http);
    await loadPrototypeSettings(http);
    expect(getPrototypeSettings()).toEqual({
      shows_estimates: true,
      allows_multiple_targets: true,
    });
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('saves a change for everyone, showing it right away', async () => {
    const { loadPrototypeSettings, setPrototypeSettings, getPrototypeSettings } = loadModule();
    const { http, put } = createHttp(DEFAULT_PROTOTYPE_SETTINGS);
    await loadPrototypeSettings(http);

    const saving = setPrototypeSettings({ shows_estimates: true });
    expect(getPrototypeSettings().shows_estimates).toBe(true);
    await saving;
    expect(put).toHaveBeenCalledWith(expect.any(String), {
      body: JSON.stringify({ shows_estimates: true }),
    });
    expect(getPrototypeSettings()).toEqual({
      shows_estimates: true,
      allows_multiple_targets: false,
    });
  });

  it('keeps a later change when an earlier one finishes saving after it', async () => {
    const { loadPrototypeSettings, setPrototypeSettings, getPrototypeSettings } = loadModule();
    const { http, put } = createHttp(DEFAULT_PROTOTYPE_SETTINGS);
    await loadPrototypeSettings(http);
    let finishFirst: () => void = () => {};
    put.mockImplementationOnce(
      () => new Promise((resolve) => (finishFirst = () => resolve(DEFAULT_PROTOTYPE_SETTINGS)))
    );

    const first = setPrototypeSettings({ allows_multiple_targets: true });
    await setPrototypeSettings({ shows_estimates: true });
    finishFirst();
    await first;
    expect(getPrototypeSettings()).toEqual({
      shows_estimates: true,
      allows_multiple_targets: true,
    });
  });

  it("goes back to what it was when a change can't be saved", async () => {
    const { loadPrototypeSettings, setPrototypeSettings, getPrototypeSettings } = loadModule();
    const { http, put } = createHttp(DEFAULT_PROTOTYPE_SETTINGS);
    put.mockRejectedValue(new Error('Forbidden'));
    await loadPrototypeSettings(http);

    await expect(setPrototypeSettings({ allows_multiple_targets: true })).rejects.toThrow(
      'Forbidden'
    );
    expect(getPrototypeSettings().allows_multiple_targets).toBe(false);
  });
});
