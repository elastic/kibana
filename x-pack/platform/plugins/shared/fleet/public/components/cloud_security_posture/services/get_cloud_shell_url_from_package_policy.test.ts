/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getCloudShellUrlFromPackagePolicy } from './get_cloud_shell_url_from_package_policy';

describe('getCloudShellUrlFromPackagePolicyy', () => {
  test('returns undefined when packagePolicy is undefined', () => {
    const result = getCloudShellUrlFromPackagePolicy(undefined);
    expect(result).toBeUndefined();
  });

  test('returns undefined when packagePolicy is defined but inputs are empty', () => {
    const packagePolicy = { inputs: [] };
    // @ts-expect-error
    const result = getCloudShellUrlFromPackagePolicy(packagePolicy);
    expect(result).toBeUndefined();
  });

  test('returns undefined when no enabled input has a CloudShellUrl', () => {
    const packagePolicy = {
      inputs: [
        { enabled: false, config: { cloud_shell_url: { value: 'url1' } } },
        { enabled: false, config: { cloud_shell_url: { value: 'url2' } } },
      ],
    };
    // @ts-expect-error
    const result = getCloudShellUrlFromPackagePolicy(packagePolicy);
    expect(result).toBeUndefined();
  });

  test('returns the CloudShellUrl of the first enabled input', () => {
    const packagePolicy = {
      inputs: [
        { enabled: false, config: { cloud_shell_url: { value: 'url1' } } },
        { enabled: true, config: { cloud_shell_url: { value: 'url2' } } },
        { enabled: true, config: { cloud_shell_url: { value: 'url3' } } },
      ],
    };
    // @ts-expect-error
    const result = getCloudShellUrlFromPackagePolicy(packagePolicy);
    expect(result).toBe('url2');
  });

  test('returns the CloudShellUrl of the first enabled input and ignores subsequent inputs', () => {
    const packagePolicy = {
      inputs: [
        { enabled: true, config: { cloud_shell_url: { value: 'url1' } } },
        { enabled: true, config: { cloud_shell_url: { value: 'url2' } } },
        { enabled: true, config: { cloud_shell_url: { value: 'url3' } } },
      ],
    };
    // @ts-expect-error
    const result = getCloudShellUrlFromPackagePolicy(packagePolicy);
    expect(result).toBe('url1');
  });

  // Add more test cases as needed
});
