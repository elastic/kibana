/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from '@kbn/rison';
import { BehaviorSubject } from 'rxjs';
import supertest from 'supertest';

import { setupServer, type SetupServerReturn } from '@kbn/core-test-helpers-test-utils';
import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { INTERNAL_ROUTES } from '@kbn/reporting-common';
import { PdfExportType } from '@kbn/reporting-export-types-pdf';
import { createMockConfigSchema } from '@kbn/reporting-mocks-server';
import { ExportTypesRegistry } from '@kbn/reporting-server/export_types_registry';

import type { ReportingCore } from '../../../..';
import { reportingMock } from '../../../../mocks';
import {
  createMockPluginSetup,
  createMockPluginStart,
  createMockReportingCore,
} from '../../../../test_helpers';
import type { ReportingRequestHandlerContext } from '../../../../types';
import { registerScheduledReportsRoutesInternal } from '..';
import type { FakeRawRequest, KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { EventTracker } from '../../../../usage';

const fakeRawRequest: FakeRawRequest = {
  headers: {
    authorization: `ApiKey skdjtq4u543yt3rhewrh`,
  },
  path: '/',
};

describe(`POST ${INTERNAL_ROUTES.SCHEDULE_PREFIX}`, () => {
  const reportingSymbol = Symbol('reporting');
  let httpSetup: SetupServerReturn;
  let server: SetupServerReturn['server'];
  let mockExportTypesRegistry: ExportTypesRegistry;
  let reportingCore: ReportingCore;
  let soClient: SavedObjectsClientContract;
  let eventTracker: EventTracker;

  const mockConfigSchema = createMockConfigSchema({
    queue: { indexInterval: 'year', timeout: 10000, pollEnabled: true },
  });

  const mockLogger = loggingSystemMock.createLogger();
  const mockCoreSetup = coreMock.createSetup();
  const auditLogger = auditLoggerMock.create();
  const mockPdfExportType = new PdfExportType(
    mockCoreSetup,
    mockConfigSchema,
    mockLogger,
    coreMock.createPluginInitializerContext(mockConfigSchema)
  );

  beforeEach(async () => {
    httpSetup = await setupServer(reportingSymbol);
    httpSetup.registerRouteHandlerContext<ReportingRequestHandlerContext, 'reporting'>(
      reportingSymbol,
      'reporting',
      () => reportingMock.createStart()
    );
    server = httpSetup.server;

    const mockSetupDeps = createMockPluginSetup({
      security: { license: { isEnabled: () => true, getFeature: () => true } },
      router: httpSetup.createRouter(''),
    });

    const mockStartDeps = await createMockPluginStart(
      {
        licensing: {
          ...licensingMock.createStart(),
          license$: new BehaviorSubject({
            isActive: true,
            isAvailable: true,
            type: 'gold',
            getFeature: () => true,
          }),
        },
        securityService: {
          authc: {
            apiKeys: { areAPIKeysEnabled: () => true },
            getCurrentUser: () => ({ id: '123', roles: ['superuser'], username: 'Tom Riddle' }),
          },
          audit: {
            asScoped: () => auditLogger,
          },
        },
      },
      mockConfigSchema
    );

    reportingCore = await createMockReportingCore(mockConfigSchema, mockSetupDeps, mockStartDeps);
    jest.spyOn(reportingCore, 'getHealthInfo').mockResolvedValue({
      isSufficientlySecure: true,
      hasPermanentEncryptionKey: true,
      areNotificationsEnabled: true,
    });

    eventTracker = new EventTracker(mockCoreSetup.analytics, 'jobId', 'exportTypeId', 'appId');
    jest.spyOn(reportingCore, 'getEventTracker').mockReturnValue(eventTracker);

    mockExportTypesRegistry = new ExportTypesRegistry(licensingMock.createSetup());
    mockExportTypesRegistry.register(mockPdfExportType);

    soClient = await reportingCore.getScopedSoClient(fakeRawRequest as unknown as KibanaRequest);
    soClient.create = jest.fn().mockImplementation(async (_, opts) => {
      return {
        id: 'foo',
        attributes: opts,
        type: 'scheduled-report',
      };
    });
  });

  afterEach(async () => {
    await server.stop();
  });

  it('returns 400 if there are no job params', async () => {
    registerScheduledReportsRoutesInternal(reportingCore, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .post(`${INTERNAL_ROUTES.SCHEDULE_PREFIX}/printablePdfV2`)
      .expect(400)
      .then(({ body }) =>
        expect(body.message).toMatchInlineSnapshot(
          '"[request body]: expected a plain object value, but found [null] instead."'
        )
      );
  });

  it('returns 400 if job params body is invalid', async () => {
    registerScheduledReportsRoutesInternal(reportingCore, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .post(`${INTERNAL_ROUTES.SCHEDULE_PREFIX}/printablePdfV2`)
      .send({ jobParams: `foo:`, schedule: { rrule: { freq: 1, interval: 2 } } })
      .expect(400)
      .then(({ body }) => expect(body.message).toMatchInlineSnapshot('"invalid rison: foo:"'));
  });

  it('returns 400 export type is invalid', async () => {
    registerScheduledReportsRoutesInternal(reportingCore, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .post(`${INTERNAL_ROUTES.SCHEDULE_PREFIX}/TonyHawksProSkater2`)
      .send({
        schedule: { rrule: { freq: 1, interval: 2 } },
        jobParams: rison.encode({ title: `abc` }),
      })
      .expect(400)
      .then(({ body }) =>
        expect(body.message).toMatchInlineSnapshot('"Invalid export-type of TonyHawksProSkater2"')
      );
  });

  it('returns 400 on invalid browser timezone', async () => {
    registerScheduledReportsRoutesInternal(reportingCore, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .post(`${INTERNAL_ROUTES.SCHEDULE_PREFIX}/printablePdfV2`)
      .send({
        jobParams: rison.encode({ browserTimezone: 'America/Amsterdam', title: `abc` }),
        schedule: { rrule: { freq: 1, interval: 2 } },
      })
      .expect(400)
      .then(({ body }) =>
        expect(body.message).toMatchInlineSnapshot(`
          "invalid params: [
            {
              \\"code\\": \\"custom\\",
              \\"message\\": \\"Invalid timezone\\",
              \\"path\\": [
                \\"browserTimezone\\"
              ]
            }
          ]"
        `)
      );
  });

  it('returns 400 on invalid rrule', async () => {
    registerScheduledReportsRoutesInternal(reportingCore, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .post(`${INTERNAL_ROUTES.SCHEDULE_PREFIX}/printablePdfV2`)
      .send({
        jobParams: rison.encode({ browserTimezone: 'America/Amsterdam', title: `abc` }),
        schedule: { rrule: { freq: 6, interval: 2 } },
      })
      .expect(400)
      .then(({ body }) =>
        expect(body.message).toMatchInlineSnapshot(`
          "[request body.schedule.rrule]: types that failed validation:
          - [request body.schedule.rrule.0.freq]: expected value to equal [1]
          - [request body.schedule.rrule.1.freq]: expected value to equal [2]
          - [request body.schedule.rrule.2.freq]: expected value to equal [3]
          - [request body.schedule.rrule.3.freq]: expected value to equal [4]"
        `)
      );
  });

  it('returns 400 on invalid rrule.dtstart date', async () => {
    registerScheduledReportsRoutesInternal(reportingCore, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .post(`${INTERNAL_ROUTES.SCHEDULE_PREFIX}/printablePdfV2`)
      .send({
        jobParams: rison.encode({ browserTimezone: 'America/Amsterdam', title: `abc` }),
        schedule: { rrule: { dtstart: '2025-06-23T14:1719.765Z', freq: 1, interval: 2 } },
      })
      .expect(400)
      .then(({ body }) =>
        expect(body.message).toMatchInlineSnapshot(`
          "[request body.schedule.rrule]: types that failed validation:
          - [request body.schedule.rrule.0.dtstart]: Invalid date: 2025-06-23T14:1719.765Z
          - [request body.schedule.rrule.1.freq]: expected value to equal [2]
          - [request body.schedule.rrule.2.freq]: expected value to equal [3]
          - [request body.schedule.rrule.3.freq]: expected value to equal [4]"
        `)
      );
  });

  it('returns 400 on invalid notification list', async () => {
    registerScheduledReportsRoutesInternal(reportingCore, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .post(`${INTERNAL_ROUTES.SCHEDULE_PREFIX}/printablePdfV2`)
      .send({
        jobParams: rison.encode({ browserTimezone: 'America/Amsterdam', title: `abc` }),
        schedule: { rrule: { freq: 1, interval: 2 } },
        notification: {
          email: {
            to: 'single@email.com',
          },
        },
      })
      .expect(400)
      .then(({ body }) =>
        expect(body.message).toEqual(
          `[request body.notification.email]: types that failed validation:\n- [request body.notification.email.0.to]: could not parse array value from json input\n- [request body.notification.email.1]: expected value to equal [null]`
        )
      );
  });

  it('returns 400 on empty notification list', async () => {
    registerScheduledReportsRoutesInternal(reportingCore, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .post(`${INTERNAL_ROUTES.SCHEDULE_PREFIX}/printablePdfV2`)
      .send({
        jobParams: rison.encode({ browserTimezone: 'America/Amsterdam', title: `abc` }),
        schedule: { rrule: { freq: 1, interval: 2 } },
        notification: {
          email: {
            to: [],
          },
        },
      })
      .expect(400)
      .then(({ body }) =>
        expect(body.message).toEqual(
          `[request body.notification.email]: types that failed validation:\n- [request body.notification.email.0]: At least one email address is required\n- [request body.notification.email.1]: expected value to equal [null]`
        )
      );
  });

  it('returns 403 on when no permanent encryption key', async () => {
    jest.spyOn(reportingCore, 'getHealthInfo').mockResolvedValueOnce({
      isSufficientlySecure: true,
      hasPermanentEncryptionKey: false,
      areNotificationsEnabled: false,
    });
    registerScheduledReportsRoutesInternal(reportingCore, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .post(`${INTERNAL_ROUTES.SCHEDULE_PREFIX}/printablePdfV2`)
      .send({
        jobParams: rison.encode({ title: `abc` }),
        schedule: { rrule: { freq: 1, interval: 2 } },
      })
      .expect(403)
      .then(({ body }) =>
        expect(body.message).toMatchInlineSnapshot(
          `"Permanent encryption key must be set for scheduled reporting"`
        )
      );
  });

  it('returns 403 on when not sufficiently secure', async () => {
    jest.spyOn(reportingCore, 'getHealthInfo').mockResolvedValueOnce({
      isSufficientlySecure: false,
      hasPermanentEncryptionKey: true,
      areNotificationsEnabled: false,
    });
    registerScheduledReportsRoutesInternal(reportingCore, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .post(`${INTERNAL_ROUTES.SCHEDULE_PREFIX}/printablePdfV2`)
      .send({
        jobParams: rison.encode({ title: `abc` }),
        schedule: { rrule: { freq: 1, interval: 2 } },
      })
      .expect(403)
      .then(({ body }) =>
        expect(body.message).toMatchInlineSnapshot(
          `"Security and API keys must be enabled for scheduled reporting"`
        )
      );
  });

  it('returns 500 if job handler throws an error', async () => {
    soClient.create = jest.fn().mockRejectedValue('silly');

    registerScheduledReportsRoutesInternal(reportingCore, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .post(`${INTERNAL_ROUTES.SCHEDULE_PREFIX}/printablePdfV2`)
      .send({
        jobParams: rison.encode({ title: `abc` }),
        schedule: { rrule: { freq: 1, interval: 2 } },
      })
      .expect(500);
  });

  it(`returns 200 if job handler doesn't error`, async () => {
    registerScheduledReportsRoutesInternal(reportingCore, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .post(`${INTERNAL_ROUTES.SCHEDULE_PREFIX}/printablePdfV2`)
      .send({
        jobParams: rison.encode({
          title: `abc`,
          layout: { id: 'preserve_layout' },
          objectType: 'canvas workpad',
        }),
        notification: {
          email: {
            bcc: ['single@email.com'],
          },
        },
        schedule: { rrule: { dtstart: '2025-06-23T14:17:19.765Z', freq: 1, interval: 2 } },
      })
      .expect(200)
      .then(({ body }) => {
        expect(body).toMatchObject({
          job: {
            created_by: 'Tom Riddle',
            id: 'foo',
            jobtype: 'printable_pdf_v2',
            payload: {
              isDeprecated: false,
              layout: {
                id: 'preserve_layout',
              },
              objectType: 'canvas workpad',
              title: 'abc',
              version: '7.14.0',
            },
            schedule: { rrule: { dtstart: '2025-06-23T14:17:19.765Z', freq: 1, interval: 2 } },
          },
        });
      });

    expect(eventTracker.createReport).toHaveBeenCalledTimes(1);
    expect(eventTracker.createReport).toHaveBeenCalledWith({
      isDeprecated: false,
      isPublicApi: false,
      scheduleType: 'scheduled',
    });
  });
});
