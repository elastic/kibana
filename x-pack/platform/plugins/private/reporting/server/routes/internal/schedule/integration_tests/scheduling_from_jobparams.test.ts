/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from '@kbn/rison';
import { BehaviorSubject } from 'rxjs';
import supertest from 'supertest';

import { setupServer } from '@kbn/core-test-helpers-test-utils';
import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { INTERNAL_ROUTES } from '@kbn/reporting-common';
import { PdfExportType } from '@kbn/reporting-export-types-pdf';
import { createMockConfigSchema } from '@kbn/reporting-mocks-server';
import { ExportTypesRegistry } from '@kbn/reporting-server/export_types_registry';

import { ReportingCore } from '../../../..';
import { reportingMock } from '../../../../mocks';
import {
  createMockPluginSetup,
  createMockPluginStart,
  createMockReportingCore,
} from '../../../../test_helpers';
import { ReportingRequestHandlerContext } from '../../../../types';
import { registerScheduleRoutesInternal } from '../schedule_from_jobparams';
import { FakeRawRequest, KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';

type SetupServerReturn = Awaited<ReturnType<typeof setupServer>>;

const fakeRawRequest: FakeRawRequest = {
  headers: {
    authorization: `ApiKey skdjtq4u543yt3rhewrh`,
  },
  path: '/',
};

describe(`POST ${INTERNAL_ROUTES.SCHEDULE_PREFIX}`, () => {
  const reportingSymbol = Symbol('reporting');
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];
  let mockExportTypesRegistry: ExportTypesRegistry;
  let reportingCore: ReportingCore;
  let soClient: SavedObjectsClientContract;

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
    ({ server, httpSetup } = await setupServer(reportingSymbol));
    httpSetup.registerRouteHandlerContext<ReportingRequestHandlerContext, 'reporting'>(
      reportingSymbol,
      'reporting',
      () => reportingMock.createStart()
    );

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

    mockExportTypesRegistry = new ExportTypesRegistry();
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
    registerScheduleRoutesInternal(reportingCore, mockLogger);

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
    registerScheduleRoutesInternal(reportingCore, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .post(`${INTERNAL_ROUTES.SCHEDULE_PREFIX}/printablePdfV2`)
      .send({ jobParams: `foo:`, schedule: { rrule: { freq: 1, interval: 2 } } })
      .expect(400)
      .then(({ body }) => expect(body.message).toMatchInlineSnapshot('"invalid rison: foo:"'));
  });

  it('returns 400 export type is invalid', async () => {
    registerScheduleRoutesInternal(reportingCore, mockLogger);

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
    registerScheduleRoutesInternal(reportingCore, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .post(`${INTERNAL_ROUTES.SCHEDULE_PREFIX}/printablePdfV2`)
      .send({
        jobParams: rison.encode({ browserTimezone: 'America/Amsterdam', title: `abc` }),
        schedule: { rrule: { freq: 1, interval: 2 } },
      })
      .expect(400)
      .then(({ body }) =>
        expect(body.message).toMatchInlineSnapshot(`"Invalid timezone \\"America/Amsterdam\\"."`)
      );
  });

  it('returns 400 on invalid rrule', async () => {
    registerScheduleRoutesInternal(reportingCore, mockLogger);

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
          - [request body.schedule.rrule.2.freq]: expected value to equal [3]"
        `)
      );
  });

  it('returns 400 on invalid notification list', async () => {
    registerScheduleRoutesInternal(reportingCore, mockLogger);

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
        expect(body.message).toMatchInlineSnapshot(
          `"[request body.notification.email.to]: could not parse array value from json input"`
        )
      );
  });

  it('returns 400 on empty notification list', async () => {
    registerScheduleRoutesInternal(reportingCore, mockLogger);

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
        expect(body.message).toMatchInlineSnapshot(
          `"[request body.notification.email]: At least one email address is required"`
        )
      );
  });

  it('returns 403 on when no permanent encryption key', async () => {
    jest.spyOn(reportingCore, 'getHealthInfo').mockResolvedValueOnce({
      isSufficientlySecure: true,
      hasPermanentEncryptionKey: false,
      areNotificationsEnabled: false,
    });
    registerScheduleRoutesInternal(reportingCore, mockLogger);

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
    registerScheduleRoutesInternal(reportingCore, mockLogger);

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

    registerScheduleRoutesInternal(reportingCore, mockLogger);

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
    registerScheduleRoutesInternal(reportingCore, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .post(`${INTERNAL_ROUTES.SCHEDULE_PREFIX}/printablePdfV2`)
      .send({
        jobParams: rison.encode({
          title: `abc`,
          layout: { id: 'test' },
          objectType: 'canvas workpad',
        }),
        notification: {
          email: {
            bcc: ['single@email.com'],
          },
        },
        schedule: { rrule: { freq: 1, interval: 2 } },
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
                id: 'test',
              },
              objectType: 'canvas workpad',
              title: 'abc',
              version: '7.14.0',
            },
            schedule: { rrule: { freq: 1, interval: 2 } },
          },
        });
      });
  });
});
