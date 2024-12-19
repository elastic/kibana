/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';
import { useMlKibana, useMlLicenseInfo } from '../contexts/kibana';
import { usePermissionCheck } from '../capabilities/check_capabilities';
import { useRouteResolver } from './use_resolver';
import type { MlLicenseInfo } from '../../../common/license/ml_license';

jest.mock('../contexts/kibana');
jest.mock('../capabilities/check_capabilities');

describe('useResolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to the home page if ML is disabled', async () => {
    (useMlLicenseInfo as jest.Mock<Partial<MlLicenseInfo>>).mockReturnValueOnce({
      isMlEnabled: false,
    });
    renderHook(() => useRouteResolver('full', ['canCreateJob']));
    expect(useMlKibana().services.application.navigateToApp).toHaveBeenCalledWith('home');
  });

  it('redirects to the home page if license is not sufficient', async () => {
    (useMlLicenseInfo as jest.Mock<Partial<MlLicenseInfo>>).mockReturnValueOnce({
      isMlEnabled: true,
      isMinimumLicense: false,
    });
    renderHook(() => useRouteResolver('full', ['canCreateJob']));
    expect(useMlKibana().services.application.navigateToApp).toHaveBeenCalledWith('home');
  });

  it('redirects to the data viz page if license is not full', async () => {
    (useMlLicenseInfo as jest.Mock<Partial<MlLicenseInfo>>).mockReturnValueOnce({
      isMlEnabled: true,
      isMinimumLicense: true,
      isFullLicense: false,
    });
    renderHook(() => useRouteResolver('full', ['canCreateJob']));
    expect(useMlKibana().services.application.navigateToApp).toHaveBeenCalledWith('ml', {
      path: 'datavisualizer',
    });
  });

  it('does not redirect if license requirements are met', async () => {
    (useMlLicenseInfo as jest.Mock<Partial<MlLicenseInfo>>).mockReturnValueOnce({
      isMlEnabled: true,
      isMinimumLicense: true,
      isFullLicense: false,
    });
    renderHook(() => useRouteResolver('basic', []));
    expect(useMlKibana().services.application.navigateToApp).not.toHaveBeenCalledWith();
    expect(useMlKibana().services.application.navigateToUrl).not.toHaveBeenCalled();
  });

  // FIXME
  it.skip('redirects to the access denied page if some required capabilities are missing', async () => {
    (usePermissionCheck as jest.Mock<boolean[]>).mockReturnValueOnce([false]);

    renderHook(() => useRouteResolver('full', ['canGetCalendars']));
    await waitFor(() => new Promise((resolve) => resolve(null)));
    expect(useMlKibana().services.application.navigateToUrl).toHaveBeenCalled();
  });
});
