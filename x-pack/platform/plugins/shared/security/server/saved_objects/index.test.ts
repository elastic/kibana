/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { typeRegistryMock } from '@kbn/core-saved-objects-base-server-mocks';

import { setupSavedObjects } from '.';
import type { AclService } from '../access_control/acl_service';
import { SavedObjectsAclExtension } from '../access_control/saved_objects_acl_extension';
import { scopedAclServiceMock } from '../access_control/scoped_acl_service.mock';
import { auditServiceMock } from '../audit/mocks';
import { authorizationMock } from '../authorization/index.mock';

describe('setupSavedObjects', () => {
  describe('ACL extension', () => {
    const request = httpServerMock.createKibanaRequest();
    const typeRegistry = typeRegistryMock.create();

    const setup = ({ accessControlEnabled }: { accessControlEnabled: boolean }) => {
      const { savedObjects } = coreMock.createSetup();
      const authz = authorizationMock.create();
      const aclService = { asScoped: jest.fn().mockReturnValue(scopedAclServiceMock.create()) };

      setupSavedObjects({
        audit: auditServiceMock.create(),
        authz,
        savedObjects,
        getCurrentUser: jest.fn(),
        accessControlEnabled,
        getAclService: () => aclService as unknown as AclService,
      });

      const [[createAclExtension]] = savedObjects.setAclExtension.mock.calls;
      return { authz, aclService, createAclExtension };
    };

    it('is built on the request-scoped access control service', () => {
      const { authz, aclService, createAclExtension } = setup({ accessControlEnabled: true });
      authz.mode.useRbacForRequest.mockReturnValue(true);

      expect(createAclExtension({ request, typeRegistry })).toBeInstanceOf(
        SavedObjectsAclExtension
      );
      expect(aclService.asScoped).toHaveBeenCalledWith(request);
    });

    it('is not provided when access control is enabled but the request does not use RBAC', () => {
      const { authz, aclService, createAclExtension } = setup({ accessControlEnabled: true });
      authz.mode.useRbacForRequest.mockReturnValue(false);

      // Core then falls back to an extension that fails closed.
      expect(createAclExtension({ request, typeRegistry })).toBeUndefined();
      expect(aclService.asScoped).not.toHaveBeenCalled();
    });

    it('is provided while access control is disabled, even without RBAC', () => {
      const { authz, createAclExtension } = setup({ accessControlEnabled: false });
      authz.mode.useRbacForRequest.mockReturnValue(false);

      expect(createAclExtension({ request, typeRegistry })).toBeInstanceOf(
        SavedObjectsAclExtension
      );
    });
  });
});
