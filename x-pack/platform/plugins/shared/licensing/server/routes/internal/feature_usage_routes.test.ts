/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import type { FeatureUsageServiceSetup } from '../../services';
import { registerNotifyFeatureUsageRoute } from './notify_feature_usage';
import { registerRegisterFeatureRoute } from './register_feature';
import {
  MAX_LICENSING_FEATURE_ID_LENGTH,
  MAX_LICENSING_LICENSE_TYPE_LENGTH,
} from './route_length_limits';

describe('licensing feature usage route maxLength bounds', () => {
  describe('POST /internal/licensing/feature_usage/notify', () => {
    const setup = () => {
      const router = httpServiceMock.createRouter();
      registerNotifyFeatureUsageRoute(router as any);
      const [routeDefinition] = router.post.mock.calls[0];
      return (routeDefinition.validate as any).body;
    };

    it('accepts a featureId at the configured limit', () => {
      const bodySchema = setup();
      expect(() =>
        bodySchema.validate({
          featureId: 'a'.repeat(MAX_LICENSING_FEATURE_ID_LENGTH),
          lastUsed: 1,
        })
      ).not.toThrow();
    });

    it('rejects a featureId over the configured limit', () => {
      const bodySchema = setup();
      expect(() =>
        bodySchema.validate({
          featureId: 'a'.repeat(MAX_LICENSING_FEATURE_ID_LENGTH + 1),
          lastUsed: 1,
        })
      ).toThrow(/maximum length/i);
    });
  });

  describe('POST /internal/licensing/feature_usage/register', () => {
    const setup = () => {
      const router = httpServiceMock.createRouter();
      registerRegisterFeatureRoute(
        router as any,
        {
          register: jest.fn(),
        } as unknown as FeatureUsageServiceSetup
      );
      const [routeDefinition] = router.post.mock.calls[0];
      return (routeDefinition.validate as any).body;
    };

    it('accepts featureId and licenseType at the configured limits', () => {
      const bodySchema = setup();
      expect(() =>
        bodySchema.validate([
          {
            featureId: 'a'.repeat(MAX_LICENSING_FEATURE_ID_LENGTH),
            // longest LICENSE_TYPE key is within this budget; use a valid enum value
            licenseType: 'enterprise',
          },
        ])
      ).not.toThrow();
      expect(MAX_LICENSING_LICENSE_TYPE_LENGTH).toBeGreaterThanOrEqual('enterprise'.length);
    });

    it('rejects a featureId over the configured limit', () => {
      const bodySchema = setup();
      expect(() =>
        bodySchema.validate([
          {
            featureId: 'a'.repeat(MAX_LICENSING_FEATURE_ID_LENGTH + 1),
            licenseType: 'enterprise',
          },
        ])
      ).toThrow(/maximum length/i);
    });

    it('rejects a licenseType over the configured limit before enum validation', () => {
      const bodySchema = setup();
      expect(() =>
        bodySchema.validate([
          {
            featureId: 'ml',
            licenseType: 'a'.repeat(MAX_LICENSING_LICENSE_TYPE_LENGTH + 1),
          },
        ])
      ).toThrow(/maximum length/i);
    });
  });
});
