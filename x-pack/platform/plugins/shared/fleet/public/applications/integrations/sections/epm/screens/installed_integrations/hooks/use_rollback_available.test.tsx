/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react';

import type { useLicense } from '../../../../../../../hooks';

import type { InstalledPackageUIPackageListItem } from '../types';

import { checkRollbackAvailability, useRollbackAvailablePackages } from './use_rollback_available';

jest.mock('../../../../../../../hooks', () => {
  const originalModule = jest.requireActual('../../../../../../../hooks');
  return {
    ...originalModule,
    useLicense: jest.fn().mockReturnValue({
      isEnterprise: () => true,
    }),
    useGetBulkRollbackAvailableCheck: jest.fn().mockReturnValue({
      'package-1': { isAvailable: true },
    }),
  };
});

describe('checkRollbackAvailability', () => {
  it('should return true if all conditions are met', () => {
    const item = {
      installationInfo: {
        previous_version: '1.0.0',
        is_rollback_ttl_expired: false,
        install_source: 'registry',
      },
      name: 'test-package',
    } as InstalledPackageUIPackageListItem;

    const licenseService = {
      isEnterprise: () => true,
    } as ReturnType<typeof useLicense>;

    const result = checkRollbackAvailability(item, licenseService, true);
    expect(result).toBe(true);
  });

  it('should return false if no previous version', () => {
    const item = {
      installationInfo: {
        previous_version: null,
        is_rollback_ttl_expired: false,
        install_source: 'registry',
      },
      name: 'test-package',
    } as InstalledPackageUIPackageListItem;

    const licenseService = {
      isEnterprise: () => true,
    } as ReturnType<typeof useLicense>;

    const result = checkRollbackAvailability(item, licenseService, true);
    expect(result).toBe(false);
  });

  it('should return false if no enterprise license', () => {
    const item = {
      installationInfo: {
        previous_version: '1.0.0',
        is_rollback_ttl_expired: false,
        install_source: 'registry',
      },
      name: 'test-package',
    } as InstalledPackageUIPackageListItem;

    const licenseService = {
      isEnterprise: () => false,
    } as ReturnType<typeof useLicense>;

    const result = checkRollbackAvailability(item, licenseService, true);
    expect(result).toBe(false);
  });

  it('should return false if ttl expired', () => {
    const item = {
      installationInfo: {
        previous_version: '1.0.0',
        is_rollback_ttl_expired: true,
        install_source: 'registry',
      },
      name: 'test-package',
    } as InstalledPackageUIPackageListItem;

    const licenseService = {
      isEnterprise: () => true,
    } as ReturnType<typeof useLicense>;

    const result = checkRollbackAvailability(item, licenseService, true);
    expect(result).toBe(false);
  });

  it('should return false if not installed from registry', () => {
    const item = {
      installationInfo: {
        previous_version: '1.0.0',
        is_rollback_ttl_expired: false,
        install_source: 'bundled',
      },
      name: 'test-package',
    } as InstalledPackageUIPackageListItem;

    const licenseService = {
      isEnterprise: () => true,
    } as ReturnType<typeof useLicense>;

    const result = checkRollbackAvailability(item, licenseService, true);
    expect(result).toBe(false);
  });

  it('should return false if backend check is false', () => {
    const item = {
      installationInfo: {
        previous_version: '1.0.0',
        is_rollback_ttl_expired: false,
        install_source: 'registry',
      },
      name: 'test-package',
    } as InstalledPackageUIPackageListItem;

    const licenseService = {
      isEnterprise: () => true,
    } as ReturnType<typeof useLicense>;

    const result = checkRollbackAvailability(item, licenseService, false);
    expect(result).toBe(false);
  });
});

describe('useRollbackAvailablePackages', () => {
  it('should return correct availability for multiple packages', () => {
    const items = [
      {
        installationInfo: {
          previous_version: '1.0.0',
          is_rollback_ttl_expired: false,
          install_source: 'registry',
        },
        name: 'package-1',
      },
      {
        installationInfo: {
          previous_version: null,
          is_rollback_ttl_expired: false,
          install_source: 'registry',
        },
        name: 'package-2',
      },
      {
        installationInfo: {
          previous_version: '2.0.0',
          is_rollback_ttl_expired: true,
          install_source: 'registry',
        },
        name: 'package-3',
      },
    ] as InstalledPackageUIPackageListItem[];

    const { result } = renderHook(() => useRollbackAvailablePackages(items));

    const expected = {
      'package-1': true,
      'package-2': false,
      'package-3': false,
    };

    expect(result.current).toEqual(expected);
  });
});
