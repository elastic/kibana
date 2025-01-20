/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageInfo } from '../../../types';

import {
  getTemplateUrlFromPackageInfo,
  SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS,
} from './get_template_url_from_package_info';

describe('getTemplateUrlFromPackageInfo', () => {
  test('returns undefined when packageInfo is undefined', () => {
    const result = getTemplateUrlFromPackageInfo(undefined, 'test', 'cloud_formation_template_url');
    expect(result).toBeUndefined();
  });

  test('returns undefined when packageInfo has no policy_templates', () => {
    const packageInfo = { inputs: [] } as unknown as PackageInfo;
    const result = getTemplateUrlFromPackageInfo(
      packageInfo,
      'test',
      'cloud_formation_template_url'
    );
    expect(result).toBeUndefined();
  });

  test('returns undefined when integrationType is not found in policy_templates', () => {
    const packageInfo = {
      policy_templates: [{ name: 'template1' }, { name: 'template2' }],
    } as PackageInfo;
    const result = getTemplateUrlFromPackageInfo(
      packageInfo,
      'nonExistentTemplate',
      'cloud_formation_template_url'
    );
    expect(result).toBeUndefined();
  });

  test('returns undefined when no input in the policy template has a cloudFormationTemplate', () => {
    const packageInfo = {
      policy_templates: [
        {
          name: 'template1',
          inputs: [
            { name: 'input1', vars: [] },
            { name: 'input2', vars: [{ name: 'var1', default: 'value1' }] },
          ],
        },
      ],
    } as unknown as PackageInfo;

    const result = getTemplateUrlFromPackageInfo(
      packageInfo,
      'template1',
      'cloud_formation_template_url'
    );
    expect(result).toBeUndefined();
  });

  test('returns the cloudFormationTemplate from the policy template', () => {
    const packageInfo = {
      policy_templates: [
        {
          name: 'template1',
          inputs: [
            { name: 'input1', vars: [] },
            {
              name: 'input2',
              vars: [
                {
                  name: SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS.CLOUD_FORMATION,
                  default: 'cloud_formation_template_url',
                },
              ],
            },
          ],
        },
      ],
    } as unknown as PackageInfo;

    const result = getTemplateUrlFromPackageInfo(
      packageInfo,
      'template1',
      SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS.CLOUD_FORMATION
    );
    expect(result).toBe('cloud_formation_template_url');
  });

  test('returns the armTemplateUrl from the policy template', () => {
    const packageInfo = {
      policy_templates: [
        {
          name: 'template1',
          inputs: [
            { name: 'input1', vars: [] },
            {
              name: 'input2',
              vars: [{ name: 'arm_template_url', default: 'arm_template_url_value' }],
            },
          ],
        },
      ],
    } as unknown as PackageInfo;

    const result = getTemplateUrlFromPackageInfo(packageInfo, 'template1', 'arm_template_url');
    expect(result).toBe('arm_template_url_value');
  });
});
