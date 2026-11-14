/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { typeRegistryMock } from '@kbn/core-saved-objects-base-server-mocks';

import { setupSavedObjects } from '.';
import { SavedObjectsOlsExtension } from './saved_objects_ols_extension';
import { auditServiceMock } from '../audit/mocks';
import { authorizationMock } from '../authorization/index.mock';
import type { OlsService } from '../authorization/ols/ols_service';
import { scopedOlsServiceMock } from '../authorization/ols/scoped_ols_service.mock';

describe('setupSavedObjects', () => {
  describe('OLS extension', () => {
    const request = httpServerMock.createKibanaRequest();
    const typeRegistry = typeRegistryMock.create();

    const setup = ({ olsEnabled }: { olsEnabled: boolean }) => {
      const { savedObjects } = coreMock.createSetup();
      const authz = authorizationMock.create();
      const olsService = { asScoped: jest.fn().mockReturnValue(scopedOlsServiceMock.create()) };

      setupSavedObjects({
        audit: auditServiceMock.create(),
        authz,
        savedObjects,
        getCurrentUser: jest.fn(),
        olsEnabled,
        getOlsService: () => olsService as unknown as OlsService,
      });

      const [[createOlsExtension]] = savedObjects.setOlsExtension.mock.calls;
      return { authz, olsService, createOlsExtension };
    };

    it('is built on the request-scoped OLS service', () => {
      const { authz, olsService, createOlsExtension } = setup({ olsEnabled: true });
      authz.mode.useRbacForRequest.mockReturnValue(true);

      expect(createOlsExtension({ request, typeRegistry })).toBeInstanceOf(
        SavedObjectsOlsExtension
      );
      expect(olsService.asScoped).toHaveBeenCalledWith(request);
    });

    it('is not provided when OLS is enabled but the request does not use RBAC', () => {
      const { authz, olsService, createOlsExtension } = setup({ olsEnabled: true });
      authz.mode.useRbacForRequest.mockReturnValue(false);

      // Core then falls back to an extension that fails closed.
      expect(createOlsExtension({ request, typeRegistry })).toBeUndefined();
      expect(olsService.asScoped).not.toHaveBeenCalled();
    });

    it('is provided while OLS is disabled, even without RBAC', () => {
      const { authz, createOlsExtension } = setup({ olsEnabled: false });
      authz.mode.useRbacForRequest.mockReturnValue(false);

      expect(createOlsExtension({ request, typeRegistry })).toBeInstanceOf(
        SavedObjectsOlsExtension
      );
    });
  });
});
