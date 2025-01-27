/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getCloudFormationPropsFromPackagePolicy } from './get_cloud_formation_props_from_package_policy';

describe('getCloudFormationPropsFromPackagePolicy', () => {
  test('returns empty CloudFormationProps when packagePolicy is undefined', () => {
    const result = getCloudFormationPropsFromPackagePolicy(undefined);
    expect(result).toEqual({
      templateUrl: undefined,
      awsAccountType: undefined,
    });
  });

  test('returns empty CloudFormationProps when packagePolicy has no inputs', () => {
    const packagePolicy = { otherProperty: 'value' };
    // @ts-expect-error
    const result = getCloudFormationPropsFromPackagePolicy(packagePolicy);
    expect(result).toEqual({
      templateUrl: undefined,
      awsAccountType: undefined,
    });
  });

  test('returns empty CloudFormationProps when no enabled input has a cloudFormationTemplateUrl', () => {
    const packagePolicy = {
      inputs: [
        { enabled: false, config: { cloud_formation_template_url: { value: 'template1' } } },
        { enabled: false, config: { cloud_formation_template_url: { value: 'template2' } } },
      ],
    };
    // @ts-expect-error
    const result = getCloudFormationPropsFromPackagePolicy(packagePolicy);
    expect(result).toEqual({
      templateUrl: undefined,
      awsAccountType: undefined,
    });
  });

  test('returns the cloudFormationTemplateUrl and awsAccountType when found in the enabled input', () => {
    const packagePolicy = {
      inputs: [
        {
          enabled: true,
          config: { cloud_formation_template_url: { value: 'template1' } },
          streams: [
            {
              vars: {
                ['aws.account_type']: { value: 'aws_account_type_value' },
              },
            },
          ],
        },
        {
          enabled: false,
          config: { cloud_formation_template_url: { value: 'template2' } },
          streams: [
            {
              vars: {
                ['aws.account_type']: { value: 'aws_account_type_value2' },
              },
            },
          ],
        },
      ],
    };
    // @ts-expect-error
    const result = getCloudFormationPropsFromPackagePolicy(packagePolicy);
    expect(result).toEqual({
      templateUrl: 'template1',
      awsAccountType: 'aws_account_type_value',
    });
  });

  test('returns the first cloudFormationTemplateUrl and awsAccountType when multiple enabled inputs have them', () => {
    const packagePolicy = {
      inputs: [
        {
          enabled: true,
          config: {
            cloud_formation_template_url: { value: 'template1' },
          },
          streams: [
            {
              vars: {
                ['aws.account_type']: { value: 'aws_account_type_value1' },
              },
            },
            {
              vars: {
                ['aws.account_type']: { value: 'aws_account_type_value2' },
              },
            },
          ],
        },
        {
          enabled: true,
          config: {
            cloud_formation_template_url: { value: 'template2' },
          },
          streams: [
            {
              vars: {
                ['aws.account_type']: { value: 'aws_account_type_value1' },
              },
            },
            {
              vars: {
                ['aws.account_type']: { value: 'aws_account_type_value2' },
              },
            },
          ],
        },
      ],
    };
    // @ts-expect-error
    const result = getCloudFormationPropsFromPackagePolicy(packagePolicy);
    expect(result).toEqual({
      templateUrl: 'template1',
      awsAccountType: 'aws_account_type_value1',
    });
  });
});
