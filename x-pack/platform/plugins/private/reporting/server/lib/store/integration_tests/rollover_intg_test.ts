/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SetupServerReturn } from '@kbn/core-test-helpers-test-utils';
import { setupServer } from '@kbn/core-test-helpers-test-utils';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createMockConfigSchema } from '@kbn/reporting-mocks-server';
import type { ScreenshottingStart } from '@kbn/screenshotting-plugin/server';
import type { ReportingCore } from '../../..';
import { createMockPluginSetup, createMockReportingCore } from '../../../test_helpers';

describe(`rollover reporting data stream`, () => {
  jest.setTimeout(6000);
  const reportingSymbol = Symbol('reporting');
  const mockLogger = loggingSystemMock.createLogger();

  let server: SetupServerReturn['server'];
  let core: ReportingCore;
  let screenshotting: jest.Mocked<ScreenshottingStart>;

  const config = createMockConfigSchema({
    queue: { timeout: 120000 },
    capture: {},
  });

  beforeEach(async () => {
    ({ server } = await setupServer(reportingSymbol));

    core = await createMockReportingCore(
      config,
      createMockPluginSetup({
        security: null,
      })
    );

    screenshotting = (await core.getPluginStartDeps()).screenshotting as typeof screenshotting;
  });

  afterEach(async () => {
    await server.stop();
  });

  it('does something', async () => {
    await server.start();

    // TBD: implement rollover integration tests
  });
});
