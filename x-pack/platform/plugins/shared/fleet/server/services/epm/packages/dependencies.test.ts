/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InstallablePackage } from '../../../../common/types';

import { appContextService } from '../../app_context';

import { getPackageDependencies } from './dependencies';

jest.mock('../../app_context');

describe('getPackageDependencies', () => {
  const mockGetExperimentalFeatures = jest.mocked(appContextService.getExperimentalFeatures);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when enableResolveDependencies is false', () => {
    mockGetExperimentalFeatures.mockReturnValue({
      enableResolveDependencies: false,
    } as ReturnType<typeof mockGetExperimentalFeatures>);

    const packageInfo: InstallablePackage = {
      name: 'test-package',
      version: '1.0.0',
      requires: {
        content: [{ package: 'dep-package', version: '1.0.0' }],
      },
    } as InstallablePackage;

    expect(getPackageDependencies(packageInfo)).toBeNull();
  });

  it('returns null when package has no requires', () => {
    mockGetExperimentalFeatures.mockReturnValue({
      enableResolveDependencies: true,
    } as ReturnType<typeof mockGetExperimentalFeatures>);

    const packageInfo: InstallablePackage = {
      name: 'test-package',
      version: '1.0.0',
    } as InstallablePackage;

    expect(getPackageDependencies(packageInfo)).toBeNull();
  });

  it('returns null when requires.content is undefined', () => {
    mockGetExperimentalFeatures.mockReturnValue({
      enableResolveDependencies: true,
    } as ReturnType<typeof mockGetExperimentalFeatures>);

    const packageInfo: InstallablePackage = {
      name: 'test-package',
      version: '1.0.0',
      requires: {},
    } as InstallablePackage;

    expect(getPackageDependencies(packageInfo)).toBeNull();
  });

  it('returns empty array when requires.content is empty', () => {
    mockGetExperimentalFeatures.mockReturnValue({
      enableResolveDependencies: true,
    } as ReturnType<typeof mockGetExperimentalFeatures>);

    const packageInfo: InstallablePackage = {
      name: 'test-package',
      version: '1.0.0',
      requires: { content: [] },
    } as unknown as InstallablePackage;

    expect(getPackageDependencies(packageInfo)).toEqual([]);
  });

  it('returns mapped dependencies when enableResolveDependencies is true and package has requires.content', () => {
    mockGetExperimentalFeatures.mockReturnValue({
      enableResolveDependencies: true,
    } as ReturnType<typeof mockGetExperimentalFeatures>);

    const packageInfo: InstallablePackage = {
      name: 'test-package',
      version: '1.0.0',
      requires: {
        content: [
          { package: 'dep-a', version: '1.0.0' },
          { package: 'dep-b', version: '2.1.0' },
        ],
      },
    } as InstallablePackage;

    expect(getPackageDependencies(packageInfo)).toEqual([
      { name: 'dep-a', version: '1.0.0' },
      { name: 'dep-b', version: '2.1.0' },
    ]);
  });

  it('maps package and version from each content item to name and version', () => {
    mockGetExperimentalFeatures.mockReturnValue({
      enableResolveDependencies: true,
    } as ReturnType<typeof mockGetExperimentalFeatures>);

    const packageInfo: InstallablePackage = {
      name: 'parent-package',
      version: '2.0.0',
      requires: {
        content: [{ package: 'elastic-agent', version: '^8.0.0' }],
      },
    } as InstallablePackage;

    const result = getPackageDependencies(packageInfo);

    expect(result).toHaveLength(1);
    expect(result![0]).toEqual({ name: 'elastic-agent', version: '^8.0.0' });
  });

  it('returns null when package has only requires.input (required input packages are not installed)', () => {
    mockGetExperimentalFeatures.mockReturnValue({
      enableResolveDependencies: true,
    } as ReturnType<typeof mockGetExperimentalFeatures>);

    const packageInfo = {
      name: 'test-package',
      version: '1.0.0',
      requires: {
        input: [{ package: 'input-dep-a', version: '1.0.0' }],
      },
    } as unknown as InstallablePackage;

    expect(getPackageDependencies(packageInfo)).toBeNull();
  });

  it('returns only requires.content dependencies and ignores requires.input', () => {
    mockGetExperimentalFeatures.mockReturnValue({
      enableResolveDependencies: true,
    } as ReturnType<typeof mockGetExperimentalFeatures>);

    const packageInfo = {
      name: 'test-package',
      version: '1.0.0',
      requires: {
        content: [{ package: 'content-dep', version: '1.0.0' }],
        input: [{ package: 'input-dep-a', version: '1.0.0' }],
      },
    } as unknown as InstallablePackage;

    expect(getPackageDependencies(packageInfo)).toEqual([
      { name: 'content-dep', version: '1.0.0' },
    ]);
  });
});
