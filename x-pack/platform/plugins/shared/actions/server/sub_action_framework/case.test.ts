/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { MockedLogger } from '@kbn/logging-mocks';
import { actionsConfigMock } from '../actions_config.mock';
import { actionsMock } from '../mocks';
import { TestCaseConnector } from './mocks';
import type { ActionsConfigurationUtilities } from '../actions_config';
import { ConnectorUsageCollector } from '../usage';

describe('CaseConnector', () => {
  let logger: MockedLogger;
  let services: ReturnType<typeof actionsMock.createServices>;
  let mockedActionsConfig: jest.Mocked<ActionsConfigurationUtilities>;
  let service: TestCaseConnector;
  let connectorUsageCollector: ConnectorUsageCollector;
  const pushToServiceIncidentParamsSchema = {
    name: z.string(),
    category: z.string().nullable().optional(),
    foo: z.array(z.boolean()).optional(),
    bar: z
      .object({
        check: z.number().nullable(),
      })
      .strict()
      .optional(),
  };

  const incidentSchemaMock = { name: 'Test', category: null, foo: [false], bar: { check: 1 } };
  const pushToServiceParams = {
    incident: { externalId: null, ...incidentSchemaMock },
    comments: [],
  };

  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();

    logger = loggingSystemMock.createLogger();
    services = actionsMock.createServices();
    mockedActionsConfig = actionsConfigMock.create();

    mockedActionsConfig.getResponseSettings.mockReturnValue({
      maxContentLength: 1000000,
      timeout: 360000,
    });

    service = new TestCaseConnector(
      {
        configurationUtilities: mockedActionsConfig,
        logger,
        connector: { id: 'test-id', type: '.test' },
        config: { url: 'https://example.com' },
        secrets: { username: 'elastic', password: 'changeme' },
        services,
      },
      pushToServiceIncidentParamsSchema
    );

    connectorUsageCollector = new ConnectorUsageCollector({
      logger,
      connectorId: 'test-connector-id',
    });
  });

  describe('Sub actions', () => {
    it('registers the pushToService sub action correctly', async () => {
      const subActions = service.getSubActions();
      expect(subActions.get('pushToService')).toEqual({
        method: 'pushToService',
        name: 'pushToService',
        schema: expect.anything(),
      });
    });

    it('should validate the schema of pushToService correctly', async () => {
      const subActions = service.getSubActions();
      const subAction = subActions.get('pushToService');
      expect(
        subAction?.schema?.parse({
          incident: { externalId: 'test', ...incidentSchemaMock },
          comments: [{ comment: 'comment', commentId: 'comment-id' }],
        })
      ).toEqual({
        incident: { externalId: 'test', ...incidentSchemaMock },
        comments: [{ comment: 'comment', commentId: 'comment-id' }],
      });
    });

    it('should accept null for externalId', async () => {
      const subActions = service.getSubActions();
      const subAction = subActions.get('pushToService');
      expect(
        subAction?.schema?.parse({
          incident: { externalId: null, ...incidentSchemaMock },
          comments: [],
        })
      );
    });

    it.each([[undefined], [1], [false], [{ test: 'hello' }], [['test']], [{ test: 'hello' }]])(
      'should throw if externalId is %p',
      async (externalId) => {
        const subActions = service.getSubActions();
        const subAction = subActions.get('pushToService');
        expect(() => subAction?.schema?.parse({ externalId, comments: [] }));
      }
    );

    it('should accept null for comments', async () => {
      const subActions = service.getSubActions();
      const subAction = subActions.get('pushToService');
      expect(
        subAction?.schema?.parse({
          incident: { externalId: 'test', ...incidentSchemaMock },
          comments: null,
        })
      );
    });

    it.each([
      [undefined],
      [1],
      [false],
      [{ test: 'hello' }],
      [['test']],
      [{ test: 'hello' }],
      [{ comment: 'comment', commentId: 'comment-id', foo: 'foo' }],
    ])('should throw if comments %p', async (comments) => {
      const subActions = service.getSubActions();
      const subAction = subActions.get('pushToService');
      expect(() => subAction?.schema?.parse({ incident: { externalId: 'test' }, comments }));
    });

    it('should throw if necessary schema params not provided', async () => {
      const subActions = service.getSubActions();
      const subAction = subActions.get('pushToService');

      expect(() =>
        subAction?.schema?.parse({
          incident: {
            externalId: 'test',
          },
        })
      ).toThrowErrorMatchingInlineSnapshot(`
        "[
          {
            \\"code\\": \\"invalid_type\\",
            \\"expected\\": \\"string\\",
            \\"received\\": \\"undefined\\",
            \\"path\\": [
              \\"incident\\",
              \\"name\\"
            ],
            \\"message\\": \\"Required\\"
          }
        ]"
      `);
    });

    it('should throw if schema params does not match string type', async () => {
      const subActions = service.getSubActions();
      const subAction = subActions.get('pushToService');

      expect(() =>
        subAction?.schema?.parse({
          incident: {
            externalId: 'test',
            name: false,
          },
        })
      ).toThrowErrorMatchingInlineSnapshot(`
        "[
          {
            \\"code\\": \\"invalid_type\\",
            \\"expected\\": \\"string\\",
            \\"received\\": \\"boolean\\",
            \\"path\\": [
              \\"incident\\",
              \\"name\\"
            ],
            \\"message\\": \\"Expected string, received boolean\\"
          }
        ]"
      `);
    });

    it('should throw if schema params does not match array type', async () => {
      const subActions = service.getSubActions();
      const subAction = subActions.get('pushToService');

      expect(() =>
        subAction?.schema?.parse({
          incident: {
            externalId: 'test',
            name: 'sample',
            foo: null,
          },
        })
      ).toThrowErrorMatchingInlineSnapshot(`
        "[
          {
            \\"code\\": \\"invalid_type\\",
            \\"expected\\": \\"array\\",
            \\"received\\": \\"null\\",
            \\"path\\": [
              \\"incident\\",
              \\"foo\\"
            ],
            \\"message\\": \\"Expected array, received null\\"
          }
        ]"
      `);
    });

    it('should throw if schema params does not match nested object type', async () => {
      const subActions = service.getSubActions();
      const subAction = subActions.get('pushToService');

      expect(() =>
        subAction?.schema?.parse({
          incident: {
            externalId: 'test',
            name: 'sample',
            foo: [true],
            bar: { check: 'hello' },
          },
        })
      ).toThrowErrorMatchingInlineSnapshot(`
        "[
          {
            \\"code\\": \\"invalid_type\\",
            \\"expected\\": \\"number\\",
            \\"received\\": \\"string\\",
            \\"path\\": [
              \\"incident\\",
              \\"bar\\",
              \\"check\\"
            ],
            \\"message\\": \\"Expected number, received string\\"
          }
        ]"
      `);
    });
  });

  describe('pushToService', () => {
    it('should create an incident if externalId is null', async () => {
      const res = await service.pushToService(pushToServiceParams, connectorUsageCollector);
      expect(res).toEqual({
        id: 'create-incident',
        title: 'Test incident',
        url: 'https://example.com',
        pushedDate: '2022-05-06T09:41:00.401Z',
      });
    });

    it('should update an incident if externalId is not null', async () => {
      const res = await service.pushToService(
        {
          incident: { ...pushToServiceParams.incident, externalId: 'test-id' },
          comments: [],
        },
        connectorUsageCollector
      );

      expect(res).toEqual({
        id: 'update-incident',
        title: 'Test incident',
        url: 'https://example.com',
        pushedDate: '2022-05-06T09:41:00.401Z',
      });
    });

    it('should add comments', async () => {
      const res = await service.pushToService(
        {
          ...pushToServiceParams,
          comments: [
            { comment: 'comment-1', commentId: 'comment-id-1' },
            { comment: 'comment-2', commentId: 'comment-id-2' },
          ],
        },
        connectorUsageCollector
      );

      expect(res).toEqual({
        id: 'create-incident',
        title: 'Test incident',
        url: 'https://example.com',
        pushedDate: '2022-05-06T09:41:00.401Z',
        comments: [
          {
            commentId: 'comment-id-1',
            pushedDate: '2022-05-06T09:41:00.401Z',
          },
          {
            commentId: 'comment-id-2',
            pushedDate: '2022-05-06T09:41:00.401Z',
          },
        ],
      });
    });

    it.each([[undefined], [null]])('should throw if externalId is %p', async (comments) => {
      const res = await service.pushToService(
        {
          ...pushToServiceParams,
          // @ts-expect-error
          comments,
        },
        connectorUsageCollector
      );

      expect(res).toEqual({
        id: 'create-incident',
        title: 'Test incident',
        url: 'https://example.com',
        pushedDate: '2022-05-06T09:41:00.401Z',
      });
    });

    it('should not add comments if comments are an empty array', async () => {
      const res = await service.pushToService(
        {
          ...pushToServiceParams,
          comments: [],
        },
        connectorUsageCollector
      );

      expect(res).toEqual({
        id: 'create-incident',
        title: 'Test incident',
        url: 'https://example.com',
        pushedDate: '2022-05-06T09:41:00.401Z',
      });
    });
  });

  describe('PushParamsSchema', () => {
    let newService: TestCaseConnector;
    beforeEach(() => {
      jest.resetAllMocks();
      jest.clearAllMocks();

      const newPushToServiceSchema = {
        name: z.string(),
        externalId: z.number(),
      };

      newService = new TestCaseConnector(
        {
          configurationUtilities: mockedActionsConfig,
          logger,
          connector: { id: 'test-id', type: '.test' },
          config: { url: 'https://example.com' },
          secrets: { username: 'elastic', password: 'changeme' },
          services,
        },
        newPushToServiceSchema
      );
    });

    it('should add externalId as null', async () => {
      const subActions = newService.getSubActions();
      const subAction = subActions.get('pushToService');
      expect(
        subAction?.schema?.parse({
          incident: { name: 'foo' },
          comments: [],
        })
      ).toEqual({
        incident: { name: 'foo', externalId: null },
        comments: [],
      });
    });

    it('should not override externalId schema', async () => {
      const subActions = newService.getSubActions();
      const subAction = subActions.get('pushToService');
      expect(() =>
        subAction?.schema?.parse({
          incident: { name: 'foo', externalId: 123 },
          comments: [],
        })
      ).toThrowErrorMatchingInlineSnapshot(`
        "[
          {
            \\"code\\": \\"invalid_type\\",
            \\"expected\\": \\"string\\",
            \\"received\\": \\"number\\",
            \\"path\\": [
              \\"incident\\",
              \\"externalId\\"
            ],
            \\"message\\": \\"Expected string, received number\\"
          }
        ]"
      `);
    });
  });
});
