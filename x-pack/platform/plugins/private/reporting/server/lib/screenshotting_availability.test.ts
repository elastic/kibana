/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CapabilitiesSwitcher } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { createMockScreenshottingStart } from '@kbn/screenshotting-plugin/server/mock';
import { registerScreenshottingCapabilitiesSwitcher } from './screenshotting_availability';

describe('registerScreenshottingCapabilitiesSwitcher', () => {
  const runSwitcher = async (pluginStartDeps: object) => {
    const core = coreMock.createSetup({ pluginStartDeps });
    registerScreenshottingCapabilitiesSwitcher(core);

    const [[switcher, options]] = core.capabilities.registerSwitcher.mock.calls as Array<
      [CapabilitiesSwitcher, { capabilityPath: string[] }]
    >;
    expect(options).toEqual({ capabilityPath: ['dashboard_v2.*', 'visualize_v2.*'] });

    return switcher(
      httpServerMock.createKibanaRequest(),
      { navLinks: {}, management: {}, catalogue: {} },
      false
    );
  };

  it('hides PDF and PNG reports when no screenshotting implementation is enabled', async () => {
    expect(await runSwitcher({})).toEqual({
      dashboard_v2: { generateScreenshot: false },
      visualize_v2: { generateScreenshot: false },
    });
  });

  it('leaves capabilities unchanged when pageRenderScreenshotting is enabled', async () => {
    expect(
      await runSwitcher({ pageRenderScreenshotting: createMockScreenshottingStart() })
    ).toEqual({});
  });

  it('leaves capabilities unchanged when screenshotting is enabled', async () => {
    expect(await runSwitcher({ screenshotting: createMockScreenshottingStart() })).toEqual({});
  });
});
