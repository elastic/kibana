/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SecureSavedObjectsClientWrapper } from './secure_saved_objects_client_wrapper';

const createMockErrors = () => {
  const forbiddenError = new Error('Mock ForbiddenError');
  const generalError = new Error('Mock GeneralError');

  return {
    forbiddenError,
    decorateForbiddenError: jest.fn().mockReturnValue(forbiddenError),
    generalError,
    decorateGeneralError: jest.fn().mockReturnValue(generalError),
  };
};

const createMockAuditLogger = () => {
  return {
    savedObjectsAuthorizationFailure: jest.fn(),
    savedObjectsAuthorizationSuccess: jest.fn(),
  };
};

const createMockActions = () => {
  return {
    savedObject: {
      get(type, action) {
        return `mock-saved_object:${type}/${action}`;
      },
    },
  };
};

describe('#errors', () => {
  test(`assigns errors from constructor to .errors`, () => {
    const errors = Symbol();

    const client = new SecureSavedObjectsClientWrapper({
      checkSavedObjectsPrivilegesWithRequest: () => {},
      errors,
    });

    expect(client.errors).toBe(errors);
  });
});

describe(`spaces disabled`, () => {
  describe('#create', () => {
    test(`throws decorated GeneralError when checkPrivileges.globally rejects promise`, async () => {
      const type = 'foo';
      const mockErrors = createMockErrors();
      const mockCheckSavedObjectsPrivileges = jest.fn(async () => {
        throw new Error('An actual error would happen here');
      });
      const mockCheckSavedObjectsPrivilegesWithRequest = jest
        .fn()
        .mockReturnValue(mockCheckSavedObjectsPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const mockActions = createMockActions();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkSavedObjectsPrivilegesWithRequest: mockCheckSavedObjectsPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });

      await expect(client.create(type)).rejects.toThrowError(mockErrors.generalError);
      expect(mockCheckSavedObjectsPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckSavedObjectsPrivileges).toHaveBeenCalledWith(
        [mockActions.savedObject.get(type, 'create')],
        undefined
      );
      expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when unauthorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const mockActions = createMockActions();
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = jest.fn(async () => ({
        hasAllRequested: false,
        username,
        privileges: {
          [mockActions.savedObject.get(type, 'create')]: false,
        },
      }));
      const mockCheckSavedObjectsPrivilegesWithRequest = jest
        .fn()
        .mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkSavedObjectsPrivilegesWithRequest: mockCheckSavedObjectsPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });
      const attributes = Symbol();
      const options = Object.freeze({ namespace: Symbol() });

      await expect(client.create(type, attributes, options)).rejects.toThrowError(
        mockErrors.forbiddenError
      );

      expect(mockCheckSavedObjectsPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges).toHaveBeenCalledWith(
        [mockActions.savedObject.get(type, 'create')],
        options.namespace
      );
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'create',
        [type],
        [mockActions.savedObject.get(type, 'create')],
        {
          type,
          attributes,
          options,
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`returns result of baseClient.create when authorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const returnValue = Symbol();
      const mockActions = createMockActions();
      const mockBaseClient = {
        create: jest.fn().mockReturnValue(returnValue),
      };
      const mockCheckPrivileges = jest.fn(async () => ({
        hasAllRequested: true,
        username,
        privileges: {
          [mockActions.savedObject.get(type, 'create')]: true,
        },
      }));
      const mockCheckSavedObjectsPrivilegesWithRequest = jest
        .fn()
        .mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: mockBaseClient,
        checkSavedObjectsPrivilegesWithRequest: mockCheckSavedObjectsPrivilegesWithRequest,
        errors: null,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });
      const attributes = Symbol();
      const options = Object.freeze({ namespace: Symbol() });

      const result = await client.create(type, attributes, options);

      expect(result).toBe(returnValue);
      expect(mockCheckSavedObjectsPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges).toHaveBeenCalledWith(
        [mockActions.savedObject.get(type, 'create')],
        options.namespace
      );
      expect(mockBaseClient.create).toHaveBeenCalledWith(type, attributes, options);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(
        username,
        'create',
        [type],
        {
          type,
          attributes,
          options,
        }
      );
    });
  });

  describe('#bulkCreate', () => {
    test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
      const type = 'foo';
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = jest.fn(async () => {
        throw new Error('An actual error would happen here');
      });
      const mockCheckSavedObjectsPrivilegesWithRequest = jest
        .fn()
        .mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const mockActions = createMockActions();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkSavedObjectsPrivilegesWithRequest: mockCheckSavedObjectsPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });

      const options = Object.freeze({ namespace: Symbol() });

      await expect(client.bulkCreate([{ type }], options)).rejects.toThrowError(
        mockErrors.generalError
      );

      expect(mockCheckSavedObjectsPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges).toHaveBeenCalledWith(
        [mockActions.savedObject.get(type, 'bulk_create')],
        options.namespace
      );
      expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when unauthorized`, async () => {
      const type1 = 'foo';
      const type2 = 'bar';
      const username = Symbol();
      const mockActions = createMockActions();
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = jest.fn(async () => ({
        hasAllRequested: false,
        username,
        privileges: {
          [mockActions.savedObject.get(type1, 'bulk_create')]: false,
          [mockActions.savedObject.get(type2, 'bulk_create')]: true,
        },
      }));
      const mockCheckSavedObjectsPrivilegesWithRequest = jest
        .fn()
        .mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkSavedObjectsPrivilegesWithRequest: mockCheckSavedObjectsPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });
      const objects = [{ type: type1 }, { type: type1 }, { type: type2 }];
      const options = Object.freeze({ namespace: Symbol() });

      await expect(client.bulkCreate(objects, options)).rejects.toThrowError(
        mockErrors.forbiddenError
      );

      expect(mockCheckSavedObjectsPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges).toHaveBeenCalledWith(
        [
          mockActions.savedObject.get(type1, 'bulk_create'),
          mockActions.savedObject.get(type2, 'bulk_create'),
        ],
        options.namespace
      );
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'bulk_create',
        [type1, type2],
        [mockActions.savedObject.get(type1, 'bulk_create')],
        {
          objects,
          options,
        }
      );
    });

    test(`returns result of baseClient.bulkCreate when authorized`, async () => {
      const username = Symbol();
      const type1 = 'foo';
      const type2 = 'bar';
      const returnValue = Symbol();
      const mockBaseClient = {
        bulkCreate: jest.fn().mockReturnValue(returnValue),
      };
      const mockActions = createMockActions();
      const mockCheckPrivileges = jest.fn(async () => ({
        hasAllRequested: true,
        username,
        privileges: {
          [mockActions.savedObject.get(type1, 'bulk_create')]: true,
          [mockActions.savedObject.get(type2, 'bulk_create')]: true,
        },
      }));
      const mockCheckSavedObjectsPrivilegesWithRequest = jest
        .fn()
        .mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: mockBaseClient,
        checkSavedObjectsPrivilegesWithRequest: mockCheckSavedObjectsPrivilegesWithRequest,
        errors: null,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });
      const objects = [{ type: type1, otherThing: 'sup' }, { type: type2, otherThing: 'everyone' }];
      const options = Object.freeze({ namespace: Symbol() });

      const result = await client.bulkCreate(objects, options);

      expect(result).toBe(returnValue);
      expect(mockCheckSavedObjectsPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges).toHaveBeenCalledWith(
        [
          mockActions.savedObject.get(type1, 'bulk_create'),
          mockActions.savedObject.get(type2, 'bulk_create'),
        ],
        options.namespace
      );
      expect(mockBaseClient.bulkCreate).toHaveBeenCalledWith(objects, options);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(
        username,
        'bulk_create',
        [type1, type2],
        {
          objects,
          options,
        }
      );
    });
  });

  describe('#delete', () => {
    test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
      const type = 'foo';
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = jest.fn(async () => {
        throw new Error('An actual error would happen here');
      });
      const mockCheckSavedObjectsPrivilegesWithRequest = jest
        .fn()
        .mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const mockActions = createMockActions();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkSavedObjectsPrivilegesWithRequest: mockCheckSavedObjectsPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });

      await expect(client.delete(type)).rejects.toThrowError(mockErrors.generalError);

      expect(mockCheckSavedObjectsPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges).toHaveBeenCalledWith(
        [mockActions.savedObject.get(type, 'delete')],
        undefined
      );
      expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when unauthorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const mockActions = createMockActions();
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = jest.fn(async () => ({
        hasAllRequested: false,
        username,
        privileges: {
          [mockActions.savedObject.get(type, 'delete')]: false,
        },
      }));
      const mockCheckSavedObjectsPrivilegesWithRequest = jest
        .fn()
        .mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkSavedObjectsPrivilegesWithRequest: mockCheckSavedObjectsPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });
      const id = Symbol();

      const options = Object.freeze({ namespace: Symbol() });

      await expect(client.delete(type, id, options)).rejects.toThrowError(
        mockErrors.forbiddenError
      );

      expect(mockCheckSavedObjectsPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges).toHaveBeenCalledWith(
        [mockActions.savedObject.get(type, 'delete')],
        options.namespace
      );
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'delete',
        [type],
        [mockActions.savedObject.get(type, 'delete')],
        {
          type,
          id,
          options,
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`returns result of internalRepository.delete when authorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const returnValue = Symbol();
      const mockActions = createMockActions();
      const mockBaseClient = {
        delete: jest.fn().mockReturnValue(returnValue),
      };
      const mockCheckPrivileges = jest.fn(async () => ({
        hasAllRequested: true,
        username,
        privileges: {
          [mockActions.savedObject.get(type, 'delete')]: true,
        },
      }));
      const mockCheckSavedObjectsPrivilegesWithRequest = jest
        .fn()
        .mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: mockBaseClient,
        checkSavedObjectsPrivilegesWithRequest: mockCheckSavedObjectsPrivilegesWithRequest,
        errors: null,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });
      const id = Symbol();
      const options = Object.freeze({ namespace: Symbol() });

      const result = await client.delete(type, id, options);

      expect(result).toBe(returnValue);
      expect(mockCheckSavedObjectsPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges).toHaveBeenCalledWith(
        [mockActions.savedObject.get(type, 'delete')],
        options.namespace
      );
      expect(mockBaseClient.delete).toHaveBeenCalledWith(type, id, options);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(
        username,
        'delete',
        [type],
        {
          type,
          id,
          options,
        }
      );
    });
  });

  describe('#find', () => {
    test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
      const type = 'foo';
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = jest.fn(async () => {
        throw new Error('An actual error would happen here');
      });
      const mockCheckSavedObjectsPrivilegesWithRequest = jest
        .fn()
        .mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const mockActions = createMockActions();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkSavedObjectsPrivilegesWithRequest: mockCheckSavedObjectsPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });

      await expect(client.find({ type })).rejects.toThrowError(mockErrors.generalError);

      expect(mockCheckSavedObjectsPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges).toHaveBeenCalledWith(
        [mockActions.savedObject.get(type, 'find')],
        undefined
      );
      expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when type's singular and unauthorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const mockActions = createMockActions();
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = jest.fn(async () => ({
        hasAllRequested: false,
        username,
        privileges: {
          [mockActions.savedObject.get(type, 'find')]: false,
        },
      }));
      const mockCheckSavedObjectsPrivilegesWithRequest = jest
        .fn()
        .mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkSavedObjectsPrivilegesWithRequest: mockCheckSavedObjectsPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });
      const options = Object.freeze({ type, namespace: Symbol });

      await expect(client.find(options)).rejects.toThrowError(mockErrors.forbiddenError);

      expect(mockCheckSavedObjectsPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges).toHaveBeenCalledWith(
        [mockActions.savedObject.get(type, 'find')],
        options.namespace
      );
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'find',
        [type],
        [mockActions.savedObject.get(type, 'find')],
        {
          options,
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when type's an array and unauthorized`, async () => {
      const type1 = 'foo';
      const type2 = 'bar';
      const username = Symbol();
      const mockActions = createMockActions();
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = jest.fn(async () => ({
        hasAllRequested: false,
        username,
        privileges: {
          [mockActions.savedObject.get(type1, 'find')]: false,
          [mockActions.savedObject.get(type2, 'find')]: true,
        },
      }));
      const mockCheckSavedObjectsPrivilegesWithRequest = jest
        .fn()
        .mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();

      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkSavedObjectsPrivilegesWithRequest: mockCheckSavedObjectsPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });
      const options = Object.freeze({ type: [type1, type2], namespace: Symbol() });

      await expect(client.find(options)).rejects.toThrowError(mockErrors.forbiddenError);

      expect(mockCheckSavedObjectsPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges).toHaveBeenCalledWith(
        [mockActions.savedObject.get(type1, 'find'), mockActions.savedObject.get(type2, 'find')],
        options.namespace
      );
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'find',
        [type1, type2],
        [mockActions.savedObject.get(type1, 'find')],
        {
          options,
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`returns result of baseClient.find when authorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const returnValue = Symbol();
      const mockActions = createMockActions();
      const mockBaseClient = {
        find: jest.fn().mockReturnValue(returnValue),
      };
      const mockCheckPrivileges = jest.fn(async () => ({
        hasAllRequested: true,
        username,
        privileges: {
          [mockActions.savedObject.get(type, 'find')]: true,
        },
      }));
      const mockCheckSavedObjectsPrivilegesWithRequest = jest
        .fn()
        .mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: mockBaseClient,
        checkSavedObjectsPrivilegesWithRequest: mockCheckSavedObjectsPrivilegesWithRequest,
        errors: null,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });
      const options = Object.freeze({ type, namespace: Symbol });

      const result = await client.find(options);

      expect(result).toBe(returnValue);
      expect(mockCheckSavedObjectsPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges).toHaveBeenCalledWith(
        [mockActions.savedObject.get(type, 'find')],
        options.namespace
      );
      expect(mockBaseClient.find).toHaveBeenCalledWith(options);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(
        username,
        'find',
        [type],
        {
          options,
        }
      );
    });
  });

  describe('#bulkGet', () => {
    test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
      const type = 'foo';
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = jest.fn(async () => {
        throw new Error('An actual error would happen here');
      });
      const mockCheckSavedObjectsPrivilegesWithRequest = jest
        .fn()
        .mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const mockActions = createMockActions();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkSavedObjectsPrivilegesWithRequest: mockCheckSavedObjectsPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });

      await expect(client.bulkGet([{ type }])).rejects.toThrowError(mockErrors.generalError);

      expect(mockCheckSavedObjectsPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges).toHaveBeenCalledWith(
        [mockActions.savedObject.get(type, 'bulk_get')],
        undefined
      );
      expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when unauthorized`, async () => {
      const type1 = 'foo';
      const type2 = 'bar';
      const username = Symbol();
      const mockActions = createMockActions();
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = jest.fn(async () => ({
        hasAllRequested: false,
        username,
        privileges: {
          [mockActions.savedObject.get(type1, 'bulk_get')]: false,
          [mockActions.savedObject.get(type2, 'bulk_get')]: true,
        },
      }));
      const mockCheckSavedObjectsPrivilegesWithRequest = jest
        .fn()
        .mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkSavedObjectsPrivilegesWithRequest: mockCheckSavedObjectsPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });
      const objects = [{ type: type1 }, { type: type1 }, { type: type2 }];
      const options = Object.freeze({ namespace: Symbol });

      await expect(client.bulkGet(objects, options)).rejects.toThrowError(
        mockErrors.forbiddenError
      );

      expect(mockCheckSavedObjectsPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges).toHaveBeenCalledWith(
        [
          mockActions.savedObject.get(type1, 'bulk_get'),
          mockActions.savedObject.get(type2, 'bulk_get'),
        ],
        options.namespace
      );
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'bulk_get',
        [type1, type2],
        [mockActions.savedObject.get(type1, 'bulk_get')],
        {
          objects,
          options,
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`returns result of baseClient.bulkGet when authorized`, async () => {
      const type1 = 'foo';
      const type2 = 'bar';
      const username = Symbol();
      const returnValue = Symbol();
      const mockActions = createMockActions();
      const mockBaseClient = {
        bulkGet: jest.fn().mockReturnValue(returnValue),
      };
      const mockCheckPrivileges = jest.fn(async () => ({
        hasAllRequested: true,
        username,
        privileges: {
          [mockActions.savedObject.get(type1, 'bulk_get')]: true,
          [mockActions.savedObject.get(type2, 'bulk_get')]: true,
        },
      }));
      const mockCheckSavedObjectsPrivilegesWithRequest = jest
        .fn()
        .mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: mockBaseClient,
        checkSavedObjectsPrivilegesWithRequest: mockCheckSavedObjectsPrivilegesWithRequest,
        errors: null,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });
      const objects = [{ type: type1, id: 'foo-id' }, { type: type2, id: 'bar-id' }];
      const options = Object.freeze({ namespace: Symbol });

      const result = await client.bulkGet(objects, options);

      expect(result).toBe(returnValue);
      expect(mockCheckSavedObjectsPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges).toHaveBeenCalledWith(
        [
          mockActions.savedObject.get(type1, 'bulk_get'),
          mockActions.savedObject.get(type2, 'bulk_get'),
        ],
        options.namespace
      );
      expect(mockBaseClient.bulkGet).toHaveBeenCalledWith(objects, options);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(
        username,
        'bulk_get',
        [type1, type2],
        {
          objects,
          options,
        }
      );
    });
  });

  describe('#get', () => {
    test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
      const type = 'foo';
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = jest.fn(async () => {
        throw new Error('An actual error would happen here');
      });
      const mockCheckSavedObjectsPrivilegesWithRequest = jest
        .fn()
        .mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const mockActions = createMockActions();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkSavedObjectsPrivilegesWithRequest: mockCheckSavedObjectsPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });

      await expect(client.get(type)).rejects.toThrowError(mockErrors.generalError);

      expect(mockCheckSavedObjectsPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges).toHaveBeenCalledWith(
        [mockActions.savedObject.get(type, 'get')],
        undefined
      );
      expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when unauthorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const mockActions = createMockActions();
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = jest.fn(async () => ({
        hasAllRequested: false,
        username,
        privileges: {
          [mockActions.savedObject.get(type, 'get')]: false,
        },
      }));
      const mockCheckSavedObjectsPrivilegesWithRequest = jest
        .fn()
        .mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkSavedObjectsPrivilegesWithRequest: mockCheckSavedObjectsPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });
      const id = Symbol();
      const options = Object.freeze({ namespace: Symbol });

      await expect(client.get(type, id, options)).rejects.toThrowError(mockErrors.forbiddenError);

      expect(mockCheckSavedObjectsPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges).toHaveBeenCalledWith(
        [mockActions.savedObject.get(type, 'get')],
        options.namespace
      );
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'get',
        [type],
        [mockActions.savedObject.get(type, 'get')],
        {
          type,
          id,
          options,
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`returns result of baseClient.get when authorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const returnValue = Symbol();
      const mockActions = createMockActions();
      const mockBaseClient = {
        get: jest.fn().mockReturnValue(returnValue),
      };
      const mockCheckPrivileges = jest.fn(async () => ({
        hasAllRequested: true,
        username,
        privileges: {
          [mockActions.savedObject.get(type, 'get')]: true,
        },
      }));
      const mockCheckSavedObjectsPrivilegesWithRequest = jest
        .fn()
        .mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: mockBaseClient,
        checkSavedObjectsPrivilegesWithRequest: mockCheckSavedObjectsPrivilegesWithRequest,
        errors: null,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });
      const id = Symbol();
      const options = Object.freeze({ namespace: Symbol });

      const result = await client.get(type, id, options);

      expect(result).toBe(returnValue);
      expect(mockCheckSavedObjectsPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges).toHaveBeenCalledWith(
        [mockActions.savedObject.get(type, 'get')],
        options.namespace
      );
      expect(mockBaseClient.get).toHaveBeenCalledWith(type, id, options);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(
        username,
        'get',
        [type],
        {
          type,
          id,
          options,
        }
      );
    });
  });

  describe('#update', () => {
    test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
      const type = 'foo';
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = jest.fn(async () => {
        throw new Error('An actual error would happen here');
      });
      const mockCheckSavedObjectsPrivilegesWithRequest = jest
        .fn()
        .mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const mockActions = createMockActions();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkSavedObjectsPrivilegesWithRequest: mockCheckSavedObjectsPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });

      await expect(client.update(type)).rejects.toThrowError(mockErrors.generalError);

      expect(mockCheckSavedObjectsPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges).toHaveBeenCalledWith(
        [mockActions.savedObject.get(type, 'update')],
        undefined
      );
      expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when unauthorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const mockActions = createMockActions();
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = jest.fn(async () => ({
        hasAllRequested: false,
        username,
        privileges: {
          [mockActions.savedObject.get(type, 'update')]: false,
        },
      }));
      const mockCheckSavedObjectsPrivilegesWithRequest = jest
        .fn()
        .mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkSavedObjectsPrivilegesWithRequest: mockCheckSavedObjectsPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });
      const id = Symbol();
      const attributes = Symbol();
      const options = Object.freeze({ namespace: Symbol });

      await expect(client.update(type, id, attributes, options)).rejects.toThrowError(
        mockErrors.forbiddenError
      );

      expect(mockCheckSavedObjectsPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges).toHaveBeenCalledWith(
        [mockActions.savedObject.get(type, 'update')],
        options.namespace
      );
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'update',
        [type],
        [mockActions.savedObject.get(type, 'update')],
        {
          type,
          id,
          attributes,
          options,
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`returns result of baseClient.update when authorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const returnValue = Symbol();
      const mockActions = createMockActions();
      const mockBaseClient = {
        update: jest.fn().mockReturnValue(returnValue),
      };
      const mockCheckPrivileges = jest.fn(async () => ({
        hasAllRequested: true,
        username,
        privileges: {
          [mockActions.savedObject.get(type, 'update')]: true,
        },
      }));
      const mockCheckSavedObjectsPrivilegesWithRequest = jest
        .fn()
        .mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: mockBaseClient,
        checkSavedObjectsPrivilegesWithRequest: mockCheckSavedObjectsPrivilegesWithRequest,
        errors: null,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });
      const id = Symbol();
      const attributes = Symbol();
      const options = Object.freeze({ namespace: Symbol });

      const result = await client.update(type, id, attributes, options);

      expect(result).toBe(returnValue);
      expect(mockCheckSavedObjectsPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges).toHaveBeenCalledWith(
        [mockActions.savedObject.get(type, 'update')],
        options.namespace
      );
      expect(mockBaseClient.update).toHaveBeenCalledWith(type, id, attributes, options);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(
        username,
        'update',
        [type],
        {
          type,
          id,
          attributes,
          options,
        }
      );
    });
  });
});
