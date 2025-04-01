/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { securityMock } from '@kbn/security-plugin/server/mocks';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { Authorization, Operations } from '.';
import type { Space, SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { spacesMock } from '@kbn/spaces-plugin/server/mocks';
import { AuthorizationAuditLogger } from './audit_logger';
import type { KibanaRequest } from '@kbn/core/server';
import type { KibanaFeature } from '@kbn/features-plugin/common';
import type { AuditLogger, SecurityPluginStart } from '@kbn/security-plugin/server';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import type { FeaturesPluginStart } from '@kbn/features-plugin/server';

const createSpacesDisabledFeaturesMock = (disabledFeatures: string[] = []) => {
  const spacesStart: jest.Mocked<SpacesPluginStart> = spacesMock.createStart();
  (spacesStart.spacesService.getActiveSpace as jest.Mock).mockImplementation(async () => {
    return {
      disabledFeatures: [],
    };
  });

  return spacesStart;
};

describe('authorization', () => {
  let request: KibanaRequest;
  let mockLogger: jest.Mocked<AuditLogger>;

  beforeEach(() => {
    request = httpServerMock.createKibanaRequest();
    mockLogger = auditLoggerMock.create();
  });

  describe('create', () => {
    let securityStart: jest.Mocked<SecurityPluginStart>;
    let featuresStart: jest.Mocked<FeaturesPluginStart>;
    let spacesStart: jest.Mocked<SpacesPluginStart>;

    beforeEach(() => {
      securityStart = securityMock.createStart();
      spacesStart = createSpacesDisabledFeaturesMock();

      featuresStart = featuresPluginMock.createStart();
      featuresStart.getKibanaFeatures.mockReturnValue([
        { id: '1', cases: ['a'] },
      ] as unknown as KibanaFeature[]);
    });

    it('creates an Authorization object', async () => {
      expect.assertions(2);

      const authPromise = Authorization.create({
        request,
        securityAuth: securityStart.authz,
        spaces: spacesStart,
        features: featuresStart,
        auditLogger: new AuthorizationAuditLogger(mockLogger),
        logger: loggingSystemMock.createLogger(),
      });

      await expect(authPromise).resolves.toBeDefined();
      await expect(authPromise).resolves.not.toThrow();
    });

    it('creates an Authorization object without spaces', async () => {
      expect.assertions(2);

      const authPromise = Authorization.create({
        request,
        securityAuth: securityStart.authz,
        features: featuresStart,
        auditLogger: new AuthorizationAuditLogger(mockLogger),
        logger: loggingSystemMock.createLogger(),
      });

      await expect(authPromise).resolves.toBeDefined();
      await expect(authPromise).resolves.not.toThrow();
    });

    it('if spaces are disabled it does not filtered out disabled features', async () => {
      (spacesStart.spacesService.getActiveSpace as jest.Mock).mockImplementation(() => {
        return { disabledFeatures: ['1'] } as Space;
      });

      const auth = await Authorization.create({
        request,
        securityAuth: securityStart.authz,
        features: featuresStart,
        auditLogger: new AuthorizationAuditLogger(mockLogger),
        logger: loggingSystemMock.createLogger(),
      });

      // @ts-expect-error: featureCaseOwners is a private method of the auth class
      expect([...auth.featureCaseOwners.values()]).toEqual(['a']);
    });

    it('throws and error when a failure occurs', async () => {
      expect.assertions(1);

      (spacesStart.spacesService.getActiveSpace as jest.Mock).mockImplementation(() => {
        throw new Error('space error');
      });

      const authPromise = Authorization.create({
        request,
        securityAuth: securityStart.authz,
        spaces: spacesStart,
        features: featuresStart,
        auditLogger: new AuthorizationAuditLogger(mockLogger),
        logger: loggingSystemMock.createLogger(),
      });

      await expect(authPromise).rejects.toThrow();
    });
  });

  describe('ensureAuthorized', () => {
    const feature = { id: '1', cases: ['a'] };
    const checkRequestReturningHasAllAsTrue = jest.fn(async () => ({ hasAllRequested: true }));

    let securityStart: ReturnType<typeof securityMock.createStart>;
    let featuresStart: jest.Mocked<FeaturesPluginStart>;
    let spacesStart: jest.Mocked<SpacesPluginStart>;
    let auth: Authorization;

    beforeEach(async () => {
      securityStart = securityMock.createStart();
      securityStart.authz.mode.useRbacForRequest.mockReturnValue(true);
      securityStart.authz.checkPrivilegesDynamicallyWithRequest.mockReturnValue(
        checkRequestReturningHasAllAsTrue
      );

      featuresStart = featuresPluginMock.createStart();
      featuresStart.getKibanaFeatures.mockReturnValue([feature] as unknown as KibanaFeature[]);

      spacesStart = createSpacesDisabledFeaturesMock();

      auth = await Authorization.create({
        request,
        securityAuth: securityStart.authz,
        spaces: spacesStart,
        features: featuresStart,
        auditLogger: new AuthorizationAuditLogger(mockLogger),
        logger: loggingSystemMock.createLogger(),
      });
    });

    it('calls checkRequest with no repeated owners', async () => {
      expect.assertions(2);

      const casesGet = securityStart.authz.actions.cases.get as jest.Mock;
      casesGet.mockImplementation((owner, op) => `${owner}/${op}`);

      try {
        await auth.ensureAuthorized({
          entities: [
            { id: '1', owner: 'b' },
            { id: '2', owner: 'b' },
          ],
          operation: Operations.createCase,
        });
      } catch (error) {
        expect(checkRequestReturningHasAllAsTrue).toBeCalledTimes(1);
        expect(checkRequestReturningHasAllAsTrue.mock.calls[0]).toMatchInlineSnapshot(`
          Array [
            Object {
              "kibana": Array [
                "b/createCase",
              ],
            },
          ]
        `);
      }
    });

    it('throws an error when the owner passed in is not included in the features when security is disabled', async () => {
      expect.assertions(1);
      securityStart.authz.mode.useRbacForRequest.mockReturnValue(false);

      try {
        await auth.ensureAuthorized({
          entities: [{ id: '1', owner: 'b' }],
          operation: Operations.createCase,
        });
      } catch (error) {
        expect(error.message).toBe('Unauthorized to create case with owners: "b"');
      }
    });

    it('throws an error with a single owner when the repeated owners passed in are not included in the features when security is disabled', async () => {
      expect.assertions(1);
      securityStart.authz.mode.useRbacForRequest.mockReturnValue(false);

      try {
        await auth.ensureAuthorized({
          entities: [
            { id: '1', owner: 'b' },
            { id: '2', owner: 'b' },
          ],
          operation: Operations.createCase,
        });
      } catch (error) {
        expect(error.message).toBe('Unauthorized to create case with owners: "b"');
      }
    });

    it('throws an error when the owner passed in is not included in the features when security undefined', async () => {
      expect.assertions(1);

      auth = await Authorization.create({
        request,
        spaces: spacesStart,
        features: featuresStart,
        auditLogger: new AuthorizationAuditLogger(mockLogger),
        logger: loggingSystemMock.createLogger(),
      });

      try {
        await auth.ensureAuthorized({
          entities: [{ id: '1', owner: 'b' }],
          operation: Operations.createCase,
        });
      } catch (error) {
        expect(error.message).toBe('Unauthorized to create case with owners: "b"');
      }
    });

    it('throws an error with a single owner when the repeated owners passed in are not included in the features when security undefined', async () => {
      expect.assertions(1);

      auth = await Authorization.create({
        request,
        spaces: spacesStart,
        features: featuresStart,
        auditLogger: new AuthorizationAuditLogger(mockLogger),
        logger: loggingSystemMock.createLogger(),
      });

      try {
        await auth.ensureAuthorized({
          entities: [
            { id: '1', owner: 'b' },
            { id: '1', owner: 'b' },
          ],
          operation: Operations.createCase,
        });
      } catch (error) {
        expect(error.message).toBe('Unauthorized to create case with owners: "b"');
      }
    });

    it('throws an error when the owner passed in is not included in the features when security is enabled', async () => {
      expect.assertions(1);

      try {
        await auth.ensureAuthorized({
          entities: [{ id: '1', owner: 'b' }],
          operation: Operations.createCase,
        });
      } catch (error) {
        expect(error.message).toBe('Unauthorized to create case with owners: "b"');
      }
    });

    it('throws an error with a single owner when the repeated owners passed in are not included in the features when security is enabled', async () => {
      expect.assertions(1);

      try {
        await auth.ensureAuthorized({
          entities: [
            { id: '1', owner: 'b' },
            { id: '2', owner: 'b' },
          ],
          operation: Operations.createCase,
        });
      } catch (error) {
        expect(error.message).toBe('Unauthorized to create case with owners: "b"');
      }
    });

    it('logs the error thrown when the passed in owner is not one of the features', async () => {
      expect.assertions(2);

      try {
        await auth.ensureAuthorized({
          entities: [
            { id: '1', owner: 'b' },
            { id: '5', owner: 'z' },
          ],
          operation: Operations.createCase,
        });
      } catch (error) {
        expect(mockLogger.log.mock.calls).toMatchInlineSnapshot(`
          Array [
            Array [
              Object {
                "error": Object {
                  "code": "Error",
                  "message": "Unauthorized to create case with owners: \\"b, z\\"",
                },
                "event": Object {
                  "action": "case_create",
                  "category": Array [
                    "database",
                  ],
                  "outcome": "failure",
                  "type": Array [
                    "creation",
                  ],
                },
                "kibana": Object {
                  "saved_object": Object {
                    "id": "1",
                    "type": "cases",
                  },
                },
                "message": "Failed attempt to create cases [id=1] as owner \\"b\\"",
              },
            ],
            Array [
              Object {
                "error": Object {
                  "code": "Error",
                  "message": "Unauthorized to create case with owners: \\"b, z\\"",
                },
                "event": Object {
                  "action": "case_create",
                  "category": Array [
                    "database",
                  ],
                  "outcome": "failure",
                  "type": Array [
                    "creation",
                  ],
                },
                "kibana": Object {
                  "saved_object": Object {
                    "id": "5",
                    "type": "cases",
                  },
                },
                "message": "Failed attempt to create cases [id=5] as owner \\"z\\"",
              },
            ],
          ]
        `);
        expect(error.message).toBe('Unauthorized to create case with owners: "b, z"');
      }
    });

    it('throws an error when the user does not have all the requested privileges', async () => {
      expect.assertions(1);

      securityStart.authz.checkPrivilegesDynamicallyWithRequest.mockReturnValue(
        jest.fn(async () => ({ hasAllRequested: false }))
      );

      try {
        await auth.ensureAuthorized({
          entities: [{ id: '1', owner: 'a' }],
          operation: Operations.createCase,
        });
      } catch (error) {
        expect(error.message).toBe('Unauthorized to create case with owners: "a"');
      }
    });

    it('throws an error with a single owner listed when the user does not have all the requested privileges', async () => {
      expect.assertions(1);

      securityStart.authz.checkPrivilegesDynamicallyWithRequest.mockReturnValue(
        jest.fn(async () => ({ hasAllRequested: false }))
      );

      try {
        await auth.ensureAuthorized({
          entities: [
            { id: '1', owner: 'a' },
            { id: '2', owner: 'a' },
          ],
          operation: Operations.createCase,
        });
      } catch (error) {
        expect(error.message).toBe('Unauthorized to create case with owners: "a"');
      }
    });

    it('throws an error when owner does not exist because it was from a disabled plugin', async () => {
      expect.assertions(1);

      (spacesStart.spacesService.getActiveSpace as jest.Mock).mockImplementation(() => {
        return { disabledFeatures: [feature.id] } as Space;
      });

      auth = await Authorization.create({
        request,
        securityAuth: securityStart.authz,
        spaces: spacesStart,
        features: featuresStart,
        auditLogger: new AuthorizationAuditLogger(mockLogger),
        logger: loggingSystemMock.createLogger(),
      });

      try {
        await auth.ensureAuthorized({
          entities: [{ id: '100', owner: feature.cases[0] }],
          operation: Operations.createCase,
        });
      } catch (error) {
        expect(error.message).toBe(
          `Unauthorized to create case with owners: "${feature.cases[0]}"`
        );
      }
    });

    it('does not throw an error when the user has the privileges needed', async () => {
      expect.assertions(1);

      featuresStart.getKibanaFeatures.mockReturnValue([
        feature,
        { id: '2', cases: ['other-owner'] },
      ] as unknown as KibanaFeature[]);

      auth = await Authorization.create({
        request,
        securityAuth: securityStart.authz,
        spaces: spacesStart,
        features: featuresStart,
        auditLogger: new AuthorizationAuditLogger(mockLogger),
        logger: loggingSystemMock.createLogger(),
      });

      await expect(
        auth.ensureAuthorized({
          entities: [
            { id: '100', owner: feature.cases[0] },
            { id: '3', owner: 'other-owner' },
          ],
          operation: Operations.createCase,
        })
      ).resolves.not.toThrow();
    });

    it('does not throw an error when the user has the privileges needed with a feature specifying multiple owners', async () => {
      expect.assertions(1);

      featuresStart.getKibanaFeatures.mockReturnValue([
        { id: '2', cases: ['a', 'other-owner'] },
      ] as unknown as KibanaFeature[]);

      auth = await Authorization.create({
        request,
        securityAuth: securityStart.authz,
        spaces: spacesStart,
        features: featuresStart,
        auditLogger: new AuthorizationAuditLogger(mockLogger),
        logger: loggingSystemMock.createLogger(),
      });

      await expect(
        auth.ensureAuthorized({
          entities: [
            { id: '100', owner: 'a' },
            { id: '3', owner: 'other-owner' },
          ],
          operation: Operations.createCase,
        })
      ).resolves.not.toThrow();
    });

    it('logs a successful authorization when the user has the privileges needed with a feature specifying multiple owners', async () => {
      expect.assertions(2);

      featuresStart.getKibanaFeatures.mockReturnValue([
        { id: '2', cases: ['a', 'other-owner'] },
      ] as unknown as KibanaFeature[]);

      auth = await Authorization.create({
        request,
        securityAuth: securityStart.authz,
        spaces: spacesStart,
        features: featuresStart,
        auditLogger: new AuthorizationAuditLogger(mockLogger),
        logger: loggingSystemMock.createLogger(),
      });

      await expect(
        auth.ensureAuthorized({
          entities: [
            { id: '100', owner: 'a' },
            { id: '3', owner: 'other-owner' },
          ],
          operation: Operations.createCase,
        })
      ).resolves.not.toThrow();

      expect(mockLogger.log.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "event": Object {
                "action": "case_create",
                "category": Array [
                  "database",
                ],
                "outcome": "unknown",
                "type": Array [
                  "creation",
                ],
              },
              "kibana": Object {
                "saved_object": Object {
                  "id": "100",
                  "type": "cases",
                },
              },
              "message": "User is creating cases [id=100] as owner \\"a\\"",
            },
          ],
          Array [
            Object {
              "event": Object {
                "action": "case_create",
                "category": Array [
                  "database",
                ],
                "outcome": "unknown",
                "type": Array [
                  "creation",
                ],
              },
              "kibana": Object {
                "saved_object": Object {
                  "id": "3",
                  "type": "cases",
                },
              },
              "message": "User is creating cases [id=3] as owner \\"other-owner\\"",
            },
          ],
        ]
      `);
    });
  });

  describe('getAuthorizationFilter', () => {
    const feature = { id: '1', cases: ['a', 'b'] };

    let securityStart: ReturnType<typeof securityMock.createStart>;
    let featuresStart: jest.Mocked<FeaturesPluginStart>;
    let spacesStart: jest.Mocked<SpacesPluginStart>;
    let auth: Authorization;

    beforeEach(async () => {
      securityStart = securityMock.createStart();
      securityStart.authz.mode.useRbacForRequest.mockReturnValue(true);
      securityStart.authz.checkPrivilegesDynamicallyWithRequest.mockReturnValue(
        jest.fn(async () => ({
          hasAllRequested: true,
          username: 'super',
          privileges: { kibana: [] },
        }))
      );

      featuresStart = featuresPluginMock.createStart();
      featuresStart.getKibanaFeatures.mockReturnValue([feature] as unknown as KibanaFeature[]);

      spacesStart = createSpacesDisabledFeaturesMock();

      auth = await Authorization.create({
        request,
        securityAuth: securityStart.authz,
        spaces: spacesStart,
        features: featuresStart,
        auditLogger: new AuthorizationAuditLogger(mockLogger),
        logger: loggingSystemMock.createLogger(),
      });
    });

    it('throws and logs an error when there are no registered owners from plugins and security is enabled', async () => {
      expect.assertions(2);

      featuresStart.getKibanaFeatures.mockReturnValue([]);

      auth = await Authorization.create({
        request,
        securityAuth: securityStart.authz,
        spaces: spacesStart,
        features: featuresStart,
        auditLogger: new AuthorizationAuditLogger(mockLogger),
        logger: loggingSystemMock.createLogger(),
      });

      try {
        await auth.getAuthorizationFilter(Operations.findCases);
      } catch (error) {
        expect(error.message).toBe('Unauthorized to access cases of any owner');
      }

      expect(mockLogger.log.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "error": Object {
                "code": "Error",
                "message": "Unauthorized to access cases of any owner",
              },
              "event": Object {
                "action": "case_find",
                "category": Array [
                  "database",
                ],
                "outcome": "failure",
                "type": Array [
                  "access",
                ],
              },
              "message": "Failed attempt to access a cases as any owners",
            },
          ],
        ]
      `);
    });

    it('does not throw an error or log when a feature owner exists and security is disabled', async () => {
      expect.assertions(3);

      auth = await Authorization.create({
        request,
        spaces: spacesStart,
        features: featuresStart,
        auditLogger: new AuthorizationAuditLogger(mockLogger),
        logger: loggingSystemMock.createLogger(),
      });

      const helpersPromise = auth.getAuthorizationFilter(Operations.findCases);
      await expect(helpersPromise).resolves.not.toThrow();
      const helpers = await Promise.resolve(helpersPromise);
      helpers.ensureSavedObjectsAreAuthorized([
        { id: '1', owner: 'blah' },
        { id: '2', owner: 'something-else' },
      ]);

      expect(helpers.filter).toBeUndefined();

      expect(mockLogger.log.mock.calls).toMatchInlineSnapshot(`Array []`);
    });

    describe('hasAllRequested: true', () => {
      it('logs and does not throw an error when passed the matching owners', async () => {
        expect.assertions(3);

        const helpersPromise = auth.getAuthorizationFilter(Operations.findCases);
        await expect(helpersPromise).resolves.not.toThrow();
        const helpers = await Promise.resolve(helpersPromise);
        helpers.ensureSavedObjectsAreAuthorized([
          { id: '1', owner: 'a' },
          { id: '2', owner: 'b' },
        ]);

        expect(helpers.filter).toMatchInlineSnapshot(`
          Object {
            "arguments": Array [
              Object {
                "arguments": Array [
                  Object {
                    "isQuoted": false,
                    "type": "literal",
                    "value": "cases.attributes.owner",
                  },
                  Object {
                    "isQuoted": false,
                    "type": "literal",
                    "value": "a",
                  },
                ],
                "function": "is",
                "type": "function",
              },
              Object {
                "arguments": Array [
                  Object {
                    "isQuoted": false,
                    "type": "literal",
                    "value": "cases.attributes.owner",
                  },
                  Object {
                    "isQuoted": false,
                    "type": "literal",
                    "value": "b",
                  },
                ],
                "function": "is",
                "type": "function",
              },
            ],
            "function": "or",
            "type": "function",
          }
        `);

        expect(mockLogger.log.mock.calls).toMatchInlineSnapshot(`
          Array [
            Array [
              Object {
                "event": Object {
                  "action": "case_find",
                  "category": Array [
                    "database",
                  ],
                  "outcome": "success",
                  "type": Array [
                    "access",
                  ],
                },
                "kibana": Object {
                  "saved_object": Object {
                    "id": "1",
                    "type": "cases",
                  },
                },
                "message": "User has accessed cases [id=1] as owner \\"a\\"",
              },
            ],
            Array [
              Object {
                "event": Object {
                  "action": "case_find",
                  "category": Array [
                    "database",
                  ],
                  "outcome": "success",
                  "type": Array [
                    "access",
                  ],
                },
                "kibana": Object {
                  "saved_object": Object {
                    "id": "2",
                    "type": "cases",
                  },
                },
                "message": "User has accessed cases [id=2] as owner \\"b\\"",
              },
            ],
          ]
        `);
      });

      it('logs and throws an error when passed an invalid owner', async () => {
        expect.assertions(4);

        const helpersPromise = auth.getAuthorizationFilter(Operations.findCases);
        await expect(helpersPromise).resolves.not.toThrow();
        const helpers = await Promise.resolve(helpersPromise);
        try {
          helpers.ensureSavedObjectsAreAuthorized([
            { id: '1', owner: 'a' },
            // c is an invalid owner, because it was not registered by a feature
            { id: '2', owner: 'c' },
          ]);
        } catch (error) {
          expect(error.message).toBe('Unauthorized to access cases with owners: "c"');
        }

        expect(helpers.filter).toMatchInlineSnapshot(`
          Object {
            "arguments": Array [
              Object {
                "arguments": Array [
                  Object {
                    "isQuoted": false,
                    "type": "literal",
                    "value": "cases.attributes.owner",
                  },
                  Object {
                    "isQuoted": false,
                    "type": "literal",
                    "value": "a",
                  },
                ],
                "function": "is",
                "type": "function",
              },
              Object {
                "arguments": Array [
                  Object {
                    "isQuoted": false,
                    "type": "literal",
                    "value": "cases.attributes.owner",
                  },
                  Object {
                    "isQuoted": false,
                    "type": "literal",
                    "value": "b",
                  },
                ],
                "function": "is",
                "type": "function",
              },
            ],
            "function": "or",
            "type": "function",
          }
        `);

        expect(mockLogger.log.mock.calls).toMatchInlineSnapshot(`
          Array [
            Array [
              Object {
                "event": Object {
                  "action": "case_find",
                  "category": Array [
                    "database",
                  ],
                  "outcome": "success",
                  "type": Array [
                    "access",
                  ],
                },
                "kibana": Object {
                  "saved_object": Object {
                    "id": "1",
                    "type": "cases",
                  },
                },
                "message": "User has accessed cases [id=1] as owner \\"a\\"",
              },
            ],
            Array [
              Object {
                "error": Object {
                  "code": "Error",
                  "message": "Unauthorized to access cases with owners: \\"c\\"",
                },
                "event": Object {
                  "action": "case_find",
                  "category": Array [
                    "database",
                  ],
                  "outcome": "failure",
                  "type": Array [
                    "access",
                  ],
                },
                "kibana": Object {
                  "saved_object": Object {
                    "id": "2",
                    "type": "cases",
                  },
                },
                "message": "Failed attempt to access cases [id=2] as owner \\"c\\"",
              },
            ],
          ]
        `);
      });
    });

    describe('hasAllRequested: false', () => {
      beforeEach(async () => {
        securityStart.authz.checkPrivilegesDynamicallyWithRequest.mockReturnValue(
          jest.fn(async () => ({
            hasAllRequested: false,
            username: 'super',
            privileges: {
              kibana: [
                {
                  authorized: true,
                  privilege: 'a:getCase',
                },
                {
                  authorized: true,
                  privilege: 'b:getCase',
                },
                {
                  authorized: false,
                  privilege: 'c:getCase',
                },
              ],
            },
          }))
        );

        (
          securityStart.authz.actions.cases.get as jest.MockedFunction<
            typeof securityStart.authz.actions.cases.get
          >
        ).mockImplementation((owner, opName) => {
          return `${owner}:${opName}`;
        });

        featuresStart.getKibanaFeatures.mockReturnValue([
          { id: 'a', cases: ['a', 'b', 'c'] },
        ] as unknown as KibanaFeature[]);

        auth = await Authorization.create({
          request,
          securityAuth: securityStart.authz,
          spaces: spacesStart,
          features: featuresStart,
          auditLogger: new AuthorizationAuditLogger(mockLogger),
          logger: loggingSystemMock.createLogger(),
        });
      });

      it('logs and does not throw an error when passed the matching owners', async () => {
        expect.assertions(3);

        const helpersPromise = auth.getAuthorizationFilter(Operations.findCases);
        await expect(helpersPromise).resolves.not.toThrow();
        const helpers = await Promise.resolve(helpersPromise);
        helpers.ensureSavedObjectsAreAuthorized([
          { id: '1', owner: 'a' },
          { id: '2', owner: 'b' },
        ]);

        expect(helpers.filter).toMatchInlineSnapshot(`
          Object {
            "arguments": Array [
              Object {
                "arguments": Array [
                  Object {
                    "isQuoted": false,
                    "type": "literal",
                    "value": "cases.attributes.owner",
                  },
                  Object {
                    "isQuoted": false,
                    "type": "literal",
                    "value": "a",
                  },
                ],
                "function": "is",
                "type": "function",
              },
              Object {
                "arguments": Array [
                  Object {
                    "isQuoted": false,
                    "type": "literal",
                    "value": "cases.attributes.owner",
                  },
                  Object {
                    "isQuoted": false,
                    "type": "literal",
                    "value": "b",
                  },
                ],
                "function": "is",
                "type": "function",
              },
            ],
            "function": "or",
            "type": "function",
          }
        `);

        expect(mockLogger.log.mock.calls).toMatchInlineSnapshot(`
          Array [
            Array [
              Object {
                "event": Object {
                  "action": "case_find",
                  "category": Array [
                    "database",
                  ],
                  "outcome": "success",
                  "type": Array [
                    "access",
                  ],
                },
                "kibana": Object {
                  "saved_object": Object {
                    "id": "1",
                    "type": "cases",
                  },
                },
                "message": "User has accessed cases [id=1] as owner \\"a\\"",
              },
            ],
            Array [
              Object {
                "event": Object {
                  "action": "case_find",
                  "category": Array [
                    "database",
                  ],
                  "outcome": "success",
                  "type": Array [
                    "access",
                  ],
                },
                "kibana": Object {
                  "saved_object": Object {
                    "id": "2",
                    "type": "cases",
                  },
                },
                "message": "User has accessed cases [id=2] as owner \\"b\\"",
              },
            ],
          ]
        `);
      });

      it('logs and throws an error when passed an invalid owner', async () => {
        expect.assertions(4);

        const helpersPromise = auth.getAuthorizationFilter(Operations.findCases);
        await expect(helpersPromise).resolves.not.toThrow();
        const helpers = await Promise.resolve(helpersPromise);
        try {
          helpers.ensureSavedObjectsAreAuthorized([
            { id: '1', owner: 'a' },
            // c is an invalid owner, because it was not registered by a feature
            { id: '2', owner: 'c' },
          ]);
        } catch (error) {
          expect(error.message).toBe('Unauthorized to access cases with owners: "c"');
        }

        expect(helpers.filter).toMatchInlineSnapshot(`
          Object {
            "arguments": Array [
              Object {
                "arguments": Array [
                  Object {
                    "isQuoted": false,
                    "type": "literal",
                    "value": "cases.attributes.owner",
                  },
                  Object {
                    "isQuoted": false,
                    "type": "literal",
                    "value": "a",
                  },
                ],
                "function": "is",
                "type": "function",
              },
              Object {
                "arguments": Array [
                  Object {
                    "isQuoted": false,
                    "type": "literal",
                    "value": "cases.attributes.owner",
                  },
                  Object {
                    "isQuoted": false,
                    "type": "literal",
                    "value": "b",
                  },
                ],
                "function": "is",
                "type": "function",
              },
            ],
            "function": "or",
            "type": "function",
          }
        `);

        expect(mockLogger.log.mock.calls).toMatchInlineSnapshot(`
          Array [
            Array [
              Object {
                "event": Object {
                  "action": "case_find",
                  "category": Array [
                    "database",
                  ],
                  "outcome": "success",
                  "type": Array [
                    "access",
                  ],
                },
                "kibana": Object {
                  "saved_object": Object {
                    "id": "1",
                    "type": "cases",
                  },
                },
                "message": "User has accessed cases [id=1] as owner \\"a\\"",
              },
            ],
            Array [
              Object {
                "error": Object {
                  "code": "Error",
                  "message": "Unauthorized to access cases with owners: \\"c\\"",
                },
                "event": Object {
                  "action": "case_find",
                  "category": Array [
                    "database",
                  ],
                  "outcome": "failure",
                  "type": Array [
                    "access",
                  ],
                },
                "kibana": Object {
                  "saved_object": Object {
                    "id": "2",
                    "type": "cases",
                  },
                },
                "message": "Failed attempt to access cases [id=2] as owner \\"c\\"",
              },
            ],
          ]
        `);
      });
    });
  });

  describe('getAndEnsureAuthorizedEntities', () => {
    const feature = { id: '1', cases: ['a', 'b'] };

    let securityStart: ReturnType<typeof securityMock.createStart>;
    let featuresStart: jest.Mocked<FeaturesPluginStart>;
    let spacesStart: jest.Mocked<SpacesPluginStart>;
    let auth: Authorization;

    beforeEach(async () => {
      securityStart = securityMock.createStart();
      securityStart.authz.mode.useRbacForRequest.mockReturnValue(true);
      securityStart.authz.checkPrivilegesDynamicallyWithRequest.mockReturnValue(
        jest.fn(async () => ({
          hasAllRequested: true,
          username: 'super',
          privileges: { kibana: [] },
        }))
      );

      featuresStart = featuresPluginMock.createStart();
      featuresStart.getKibanaFeatures.mockReturnValue([feature] as unknown as KibanaFeature[]);

      spacesStart = createSpacesDisabledFeaturesMock();

      auth = await Authorization.create({
        request,
        securityAuth: securityStart.authz,
        spaces: spacesStart,
        features: featuresStart,
        auditLogger: new AuthorizationAuditLogger(mockLogger),
        logger: loggingSystemMock.createLogger(),
      });
    });

    it('throws and logs an error when there are no registered owners from plugins and security is enabled', async () => {
      expect.assertions(2);

      featuresStart.getKibanaFeatures.mockReturnValue([]);

      auth = await Authorization.create({
        request,
        securityAuth: securityStart.authz,
        spaces: spacesStart,
        features: featuresStart,
        auditLogger: new AuthorizationAuditLogger(mockLogger),
        logger: loggingSystemMock.createLogger(),
      });

      try {
        await auth.getAndEnsureAuthorizedEntities({
          savedObjects: [
            { id: '1', attributes: { owner: 'b' }, type: 'test', references: [] },
            { id: '2', attributes: { owner: 'c' }, type: 'test', references: [] },
          ],
          operation: Operations.bulkGetCases,
        });
      } catch (error) {
        expect(error.message).toBe('Unauthorized to access cases of any owner');
      }

      expect(mockLogger.log.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "error": Object {
                "code": "Error",
                "message": "Unauthorized to access cases of any owner",
              },
              "event": Object {
                "action": "case_bulk_get",
                "category": Array [
                  "database",
                ],
                "outcome": "failure",
                "type": Array [
                  "access",
                ],
              },
              "kibana": Object {
                "saved_object": Object {
                  "id": "1",
                  "type": "cases",
                },
              },
              "message": "Failed attempt to access cases [id=1] as owner \\"b\\"",
            },
          ],
          Array [
            Object {
              "error": Object {
                "code": "Error",
                "message": "Unauthorized to access cases of any owner",
              },
              "event": Object {
                "action": "case_bulk_get",
                "category": Array [
                  "database",
                ],
                "outcome": "failure",
                "type": Array [
                  "access",
                ],
              },
              "kibana": Object {
                "saved_object": Object {
                  "id": "2",
                  "type": "cases",
                },
              },
              "message": "Failed attempt to access cases [id=2] as owner \\"c\\"",
            },
          ],
        ]
      `);
    });

    it('does not throw an error when a feature owner exists and security is disabled but logs', async () => {
      expect.assertions(2);

      auth = await Authorization.create({
        request,
        spaces: spacesStart,
        features: featuresStart,
        auditLogger: new AuthorizationAuditLogger(mockLogger),
        logger: loggingSystemMock.createLogger(),
      });

      const helpersPromise = auth.getAndEnsureAuthorizedEntities({
        savedObjects: [
          { id: '1', attributes: { owner: 'a' }, type: 'test', references: [] },
          { id: '2', attributes: { owner: 'b' }, type: 'test', references: [] },
        ],
        operation: Operations.bulkGetCases,
      });

      await expect(helpersPromise).resolves.not.toThrow();

      expect(mockLogger.log.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "event": Object {
                "action": "case_bulk_get",
                "category": Array [
                  "database",
                ],
                "outcome": "success",
                "type": Array [
                  "access",
                ],
              },
              "kibana": Object {
                "saved_object": Object {
                  "id": "1",
                  "type": "cases",
                },
              },
              "message": "User has accessed cases [id=1] as owner \\"a\\"",
            },
          ],
          Array [
            Object {
              "event": Object {
                "action": "case_bulk_get",
                "category": Array [
                  "database",
                ],
                "outcome": "success",
                "type": Array [
                  "access",
                ],
              },
              "kibana": Object {
                "saved_object": Object {
                  "id": "2",
                  "type": "cases",
                },
              },
              "message": "User has accessed cases [id=2] as owner \\"b\\"",
            },
          ],
        ]
      `);
    });

    describe('hasAllRequested: true', () => {
      it('categorizes the registered owners a and b as authorized and the unregistered owner c as unauthorized', async () => {
        auth = await Authorization.create({
          request,
          spaces: spacesStart,
          features: featuresStart,
          auditLogger: new AuthorizationAuditLogger(mockLogger),
          logger: loggingSystemMock.createLogger(),
        });

        const res = await auth.getAndEnsureAuthorizedEntities({
          savedObjects: [
            { id: '1', attributes: { owner: 'a' }, type: 'test', references: [] },
            { id: '2', attributes: { owner: 'b' }, type: 'test', references: [] },
            { id: '3', attributes: { owner: 'c' }, type: 'test', references: [] },
          ],
          operation: Operations.bulkGetCases,
        });

        expect(res).toEqual({
          authorized: [
            { id: '1', attributes: { owner: 'a' }, type: 'test', references: [] },
            { id: '2', attributes: { owner: 'b' }, type: 'test', references: [] },
          ],
          unauthorized: [{ id: '3', attributes: { owner: 'c' }, type: 'test', references: [] }],
        });

        expect(mockLogger.log.mock.calls).toMatchInlineSnapshot(`
          Array [
            Array [
              Object {
                "event": Object {
                  "action": "case_bulk_get",
                  "category": Array [
                    "database",
                  ],
                  "outcome": "success",
                  "type": Array [
                    "access",
                  ],
                },
                "kibana": Object {
                  "saved_object": Object {
                    "id": "1",
                    "type": "cases",
                  },
                },
                "message": "User has accessed cases [id=1] as owner \\"a\\"",
              },
            ],
            Array [
              Object {
                "event": Object {
                  "action": "case_bulk_get",
                  "category": Array [
                    "database",
                  ],
                  "outcome": "success",
                  "type": Array [
                    "access",
                  ],
                },
                "kibana": Object {
                  "saved_object": Object {
                    "id": "2",
                    "type": "cases",
                  },
                },
                "message": "User has accessed cases [id=2] as owner \\"b\\"",
              },
            ],
          ]
        `);
      });
    });

    describe('hasAllRequested: false', () => {
      const checkPrivilegesResponse = {
        hasAllRequested: false,
        username: 'super',
        privileges: {
          kibana: [
            {
              authorized: true,
              privilege: 'a:getCase',
            },
            {
              authorized: true,
              privilege: 'b:getCase',
            },
            {
              authorized: false,
              privilege: 'c:getCase',
            },
          ],
        },
      };

      beforeEach(async () => {
        securityStart.authz.checkPrivilegesDynamicallyWithRequest.mockReturnValueOnce(
          jest.fn(async () => checkPrivilegesResponse)
        );

        securityStart.authz.checkPrivilegesDynamicallyWithRequest.mockReturnValueOnce(
          jest.fn(async () => ({
            ...checkPrivilegesResponse,
            hasAllRequested: true,
          }))
        );

        (
          securityStart.authz.actions.cases.get as jest.MockedFunction<
            typeof securityStart.authz.actions.cases.get
          >
        ).mockImplementation((owner, opName) => {
          return `${owner}:${opName}`;
        });

        featuresStart.getKibanaFeatures.mockReturnValue([
          { id: 'a', cases: ['a', 'b', 'c'] },
        ] as unknown as KibanaFeature[]);

        auth = await Authorization.create({
          request,
          securityAuth: securityStart.authz,
          spaces: spacesStart,
          features: featuresStart,
          auditLogger: new AuthorizationAuditLogger(mockLogger),
          logger: loggingSystemMock.createLogger(),
        });
      });

      it('categorizes the registered owners a and b as authorized and the unregistered owner c as unauthorized', async () => {
        const res = await auth.getAndEnsureAuthorizedEntities({
          savedObjects: [
            { id: '1', attributes: { owner: 'a' }, type: 'test', references: [] },
            { id: '2', attributes: { owner: 'b' }, type: 'test', references: [] },
            { id: '3', attributes: { owner: 'c' }, type: 'test', references: [] },
          ],
          operation: Operations.bulkGetCases,
        });

        expect(res).toEqual({
          authorized: [
            { id: '1', attributes: { owner: 'a' }, type: 'test', references: [] },
            { id: '2', attributes: { owner: 'b' }, type: 'test', references: [] },
          ],
          unauthorized: [{ id: '3', attributes: { owner: 'c' }, type: 'test', references: [] }],
        });
      });
    });
  });

  describe('ensureAuthorized with operation arrays', () => {
    let auth: Authorization;
    let securityStart: ReturnType<typeof securityMock.createStart>;
    let featuresStart: jest.Mocked<FeaturesPluginStart>;
    let spacesStart: jest.Mocked<SpacesPluginStart>;

    beforeEach(async () => {
      securityStart = securityMock.createStart();
      securityStart.authz.mode.useRbacForRequest.mockReturnValue(true);
      securityStart.authz.checkPrivilegesDynamicallyWithRequest.mockReturnValue(
        jest.fn(async () => ({ hasAllRequested: true }))
      );

      featuresStart = featuresPluginMock.createStart();
      featuresStart.getKibanaFeatures.mockReturnValue([
        { id: '1', cases: ['a'] },
      ] as unknown as KibanaFeature[]);

      spacesStart = createSpacesDisabledFeaturesMock();

      auth = await Authorization.create({
        request,
        securityAuth: securityStart.authz,
        spaces: spacesStart,
        features: featuresStart,
        auditLogger: new AuthorizationAuditLogger(mockLogger),
        logger: loggingSystemMock.createLogger(),
      });
    });

    it('handles multiple operations successfully when authorized', async () => {
      await expect(
        auth.ensureAuthorized({
          entities: [{ id: '1', owner: 'a' }],
          operation: [Operations.createCase, Operations.getCase],
        })
      ).resolves.not.toThrow();

      expect(mockLogger.log.mock.calls).toMatchSnapshot();
    });

    it('throws on first unauthorized operation in array', async () => {
      securityStart.authz.checkPrivilegesDynamicallyWithRequest.mockReturnValue(
        jest.fn(async () => ({ hasAllRequested: false }))
      );

      await expect(
        auth.ensureAuthorized({
          entities: [{ id: '1', owner: 'a' }],
          operation: [Operations.createCase, Operations.getCase],
        })
      ).rejects.toThrow('Unauthorized to create, access case with owners: "a"');

      expect(mockLogger.log.mock.calls).toMatchSnapshot();
    });

    it('logs each operation separately', async () => {
      await auth.ensureAuthorized({
        entities: [{ id: '1', owner: 'a' }],
        operation: [Operations.createCase, Operations.getCase],
      });

      expect(mockLogger.log).toHaveBeenCalledTimes(2);
      expect(mockLogger.log.mock.calls).toMatchSnapshot();
    });

    it('handles empty operation array', async () => {
      await expect(
        auth.ensureAuthorized({
          entities: [{ id: '1', owner: 'a' }],
          operation: [],
        })
      ).resolves.not.toThrow();
    });
  });
});
