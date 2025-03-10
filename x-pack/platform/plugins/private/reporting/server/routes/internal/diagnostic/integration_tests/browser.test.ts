/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import supertest from 'supertest';

import { setupServer } from '@kbn/core-test-helpers-test-utils';
import { docLinksServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { INTERNAL_ROUTES } from '@kbn/reporting-common';
import { createMockConfigSchema } from '@kbn/reporting-mocks-server';
import { ScreenshottingStart } from '@kbn/screenshotting-plugin/server';
import { IUsageCounter } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counter';
import { ReportingCore } from '../../../..';
import { reportingMock } from '../../../../mocks';
import { createMockPluginSetup, createMockReportingCore } from '../../../../test_helpers';
import { ReportingRequestHandlerContext } from '../../../../types';
import { registerDiagnoseBrowser } from '../browser';

type SetupServerReturn = Awaited<ReturnType<typeof setupServer>>;

const devtoolMessage = 'DevTools listening on (ws://localhost:4000)';
const fontNotFoundMessage = 'Could not find the default font';

describe(`GET ${INTERNAL_ROUTES.DIAGNOSE.BROWSER}`, () => {
  jest.setTimeout(6000);
  const reportingSymbol = Symbol('reporting');
  const mockLogger = loggingSystemMock.createLogger();

  let server: SetupServerReturn['server'];
  let usageCounter: IUsageCounter;
  let httpSetup: SetupServerReturn['httpSetup'];
  let core: ReportingCore;
  let screenshotting: jest.Mocked<ScreenshottingStart>;

  const config = createMockConfigSchema({
    queue: { timeout: 120000 },
    capture: {},
  });

  beforeEach(async () => {
    ({ server, httpSetup } = await setupServer(reportingSymbol));
    httpSetup.registerRouteHandlerContext<ReportingRequestHandlerContext, 'reporting'>(
      reportingSymbol,
      'reporting',
      () => reportingMock.createStart()
    );

    const docLinksSetupMock = docLinksServiceMock.createSetupContract();
    core = await createMockReportingCore(
      config,
      createMockPluginSetup({
        router: httpSetup.createRouter(''),
        security: null,
        docLinks: {
          ...docLinksSetupMock,
          links: {
            ...docLinksSetupMock.links,
            reporting: {
              browserSystemDependencies:
                'https://www.elastic.co/guide/en/kibana/test-branch/secure-reporting.html#install-reporting-packages',
            },
          },
        },
      })
    );

    usageCounter = {
      domainId: 'abc123',
      incrementCounter: jest.fn(),
    };
    core.getUsageCounter = jest.fn().mockReturnValue(usageCounter);

    screenshotting = (await core.getPluginStartDeps()).screenshotting as typeof screenshotting;
  });

  afterEach(async () => {
    await server.stop();
  });

  it('returns a 200 when successful', async () => {
    registerDiagnoseBrowser(core, mockLogger);

    await server.start();

    screenshotting.diagnose.mockReturnValue(Rx.of(devtoolMessage));

    return supertest(httpSetup.server.listener)
      .get(INTERNAL_ROUTES.DIAGNOSE.BROWSER)
      .expect(200)
      .then(({ body }) => {
        expect(body.success).toEqual(true);
        expect(body.help).toEqual([]);
      });
  });

  it('returns logs when browser crashes + helpful links', async () => {
    const logs = `Could not find the default font`;
    registerDiagnoseBrowser(core, mockLogger);

    await server.start();
    screenshotting.diagnose.mockReturnValue(Rx.of(logs));

    return supertest(httpSetup.server.listener)
      .get(INTERNAL_ROUTES.DIAGNOSE.BROWSER)
      .expect(200)
      .then(({ body }) => {
        expect(body).toMatchInlineSnapshot(`
          Object {
            "help": Array [
              "The browser couldn't locate a default font. Please see https://www.elastic.co/guide/en/kibana/test-branch/secure-reporting.html#install-reporting-packages to fix this issue.",
            ],
            "logs": "Could not find the default font",
            "success": false,
          }
        `);
      });
  });

  it('returns a response including log received from the browser + helpful link on font config error', async () => {
    const fontErrorLog = `Fontconfig error: Cannot load default config file: No such file: (null)`;

    registerDiagnoseBrowser(core, mockLogger);

    await server.start();
    screenshotting.diagnose.mockReturnValue(Rx.of(fontErrorLog));

    return supertest(httpSetup.server.listener)
      .get(INTERNAL_ROUTES.DIAGNOSE.BROWSER)
      .expect(200)
      .then(({ body }) => {
        expect(body).toMatchInlineSnapshot(`
          Object {
            "help": Array [
              "The browser couldn't start properly due to missing system font dependencies. Please see https://www.elastic.co/guide/en/kibana/test-branch/secure-reporting.html#install-reporting-packages",
            ],
            "logs": "${fontErrorLog}",
            "success": false,
          }
        `);
      });
  });

  it('logs a message when the browser starts, but then has problems later', async () => {
    registerDiagnoseBrowser(core, mockLogger);

    await server.start();
    screenshotting.diagnose.mockReturnValue(Rx.of(`${devtoolMessage}\n${fontNotFoundMessage}`));

    return supertest(httpSetup.server.listener)
      .get(INTERNAL_ROUTES.DIAGNOSE.BROWSER)
      .expect(200)
      .then(({ body }) => {
        expect(body).toMatchInlineSnapshot(`
          Object {
            "help": Array [
              "The browser couldn't locate a default font. Please see https://www.elastic.co/guide/en/kibana/test-branch/secure-reporting.html#install-reporting-packages to fix this issue.",
            ],
            "logs": "DevTools listening on (ws://localhost:4000)
          Could not find the default font",
            "success": false,
          }
        `);
      });
  });

  describe('usage counter', () => {
    it('increments the counter', async () => {
      registerDiagnoseBrowser(core, mockLogger);

      await server.start();

      screenshotting.diagnose.mockReturnValue(Rx.of(devtoolMessage));

      await supertest(httpSetup.server.listener).get(INTERNAL_ROUTES.DIAGNOSE.BROWSER).expect(200);

      expect(usageCounter.incrementCounter).toHaveBeenCalledTimes(1);
      expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `get ${INTERNAL_ROUTES.DIAGNOSE.BROWSER}:success`,
        counterType: 'reportingApi',
      });
    });
  });
});
