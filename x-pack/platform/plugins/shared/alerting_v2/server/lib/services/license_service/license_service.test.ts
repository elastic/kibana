/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { License } from '@kbn/licensing-plugin/common/license';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import type { LicenseType } from '@kbn/licensing-types';
import { ALERTING_ERROR_CODES } from '../../errors/error_codes';
import { LicenseService } from './license_service';

const createLicense = (type: LicenseType, status: 'active' | 'expired' = 'active') =>
  licensingMock.createLicense({ license: { type, mode: type, status } });

const expectLicenseError = (details: Record<string, string | null>) =>
  expect.objectContaining({
    output: expect.objectContaining({ statusCode: 403 }),
    message: 'Action policies require an active enterprise license',
    data: { code: ALERTING_ERROR_CODES.ACTION_POLICY_LICENSE_NOT_SUPPORTED, details },
  });

describe('LicenseService', () => {
  let licensing: ReturnType<typeof licensingMock.createStart>;
  let service: LicenseService;

  beforeEach(() => {
    licensing = licensingMock.createStart();
    service = new LicenseService(licensing);
  });

  describe('getActionPoliciesLicenseState', () => {
    it.each<LicenseType>(['enterprise', 'trial'])(
      'reports a valid state for an active %s license',
      async (type) => {
        licensing.getLicense.mockResolvedValue(createLicense(type));

        await expect(service.getActionPoliciesLicenseState()).resolves.toEqual({
          isValid: true,
          type,
          status: 'active',
        });
      }
    );

    it.each<LicenseType>(['basic', 'standard', 'gold', 'platinum'])(
      'reports an invalid state for an active %s license',
      async (type) => {
        licensing.getLicense.mockResolvedValue(createLicense(type));

        await expect(service.getActionPoliciesLicenseState()).resolves.toEqual({
          isValid: false,
          type,
          status: 'active',
        });
      }
    );

    it('reports an invalid state for an expired enterprise license', async () => {
      licensing.getLicense.mockResolvedValue(createLicense('enterprise', 'expired'));

      await expect(service.getActionPoliciesLicenseState()).resolves.toEqual({
        isValid: false,
        type: 'enterprise',
        status: 'expired',
      });
    });

    it('reports an invalid state when license information is unavailable', async () => {
      licensing.getLicense.mockResolvedValue(
        new License({ error: 'Elasticsearch license API unavailable', signature: 'error-sig' })
      );

      await expect(service.getActionPoliciesLicenseState()).resolves.toEqual({
        isValid: false,
        type: null,
        status: null,
      });
    });
  });

  describe('assertActionPoliciesLicense', () => {
    it.each<LicenseType>(['enterprise', 'trial'])(
      'resolves for an active %s license',
      async (type) => {
        licensing.getLicense.mockResolvedValue(createLicense(type));

        await expect(service.assertActionPoliciesLicense()).resolves.toBeUndefined();
      }
    );

    it.each<LicenseType>(['basic', 'standard', 'gold', 'platinum'])(
      'throws a 403 with the license error code and details for an active %s license',
      async (type) => {
        licensing.getLicense.mockResolvedValue(createLicense(type));

        await expect(service.assertActionPoliciesLicense()).rejects.toEqual(
          expectLicenseError({
            required_license: 'enterprise',
            current_license: type,
            license_status: 'active',
          })
        );
      }
    );

    it('throws and reports the license status when the enterprise license is expired', async () => {
      licensing.getLicense.mockResolvedValue(createLicense('enterprise', 'expired'));

      await expect(service.assertActionPoliciesLicense()).rejects.toEqual(
        expectLicenseError({
          required_license: 'enterprise',
          current_license: 'enterprise',
          license_status: 'expired',
        })
      );
    });

    it('throws when license information is unavailable', async () => {
      licensing.getLicense.mockResolvedValue(
        new License({ error: 'Elasticsearch license API unavailable', signature: 'error-sig' })
      );

      await expect(service.assertActionPoliciesLicense()).rejects.toEqual(
        expectLicenseError({
          required_license: 'enterprise',
          current_license: null,
          license_status: null,
        })
      );
    });
  });
});
