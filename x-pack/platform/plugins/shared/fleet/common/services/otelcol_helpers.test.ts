/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageInfo } from '../types';

import {
  packageInfoHasOtelInputs,
  packagePolicyHasOtelInputs,
  packageInfoHasMultipleSignalTypes,
} from './otelcol_helpers';

describe('packageInfoHasOtelInputs', () => {
  const otelPackageInfo = {
    name: 'otel-input-package',
    version: '0.0.1',
    type: 'input',
    policy_templates: [
      {
        name: 'template1',
        title: 'HTTP Check',
        input: 'otelcol',
        type: 'logs',
        template_path: 'input.yml.hbs',
        vars: [],
      },
      {
        name: 'template2',
        title: 'Template 2',
        description: '',
        inputs: [],
      },
    ],
  } as any as PackageInfo;

  const nonOtelPackageInfo = {
    name: 'otel-input-package',
    version: '0.0.1',
    type: 'input',
    policy_templates: [
      {
        name: 'template1',
        title: 'Template 1',
        type: 'logs',
        template_path: 'input.yml.hbs',
        vars: [],
      },
      {
        name: 'template2',
        title: 'Template 2',
        description: '',
        inputs: [],
      },
    ],
  } as any as PackageInfo;

  it('should return true if passed packageInfo has Otelcol inputs', () => {
    expect(packageInfoHasOtelInputs(otelPackageInfo)).toBe(true);
  });

  it('should return false if passed packageInfo has no Otelcol inputs', () => {
    expect(packageInfoHasOtelInputs(nonOtelPackageInfo)).toBe(false);
  });

  it('should return false if undefined is passed', () => {
    expect(packageInfoHasOtelInputs(undefined)).toBe(false);
  });
});

describe('packagePolicyHasOtelInputs', () => {
  it('should return true if passed policy has Otelcol inputs and at least one is enabled', () => {
    expect(
      packagePolicyHasOtelInputs([
        {
          id: 'input1',
          type: 'otelcol',
          enabled: true,
          vars: [],
          streams: [],
        },
        {
          id: 'input2',
          type: 'otelcol',
          enabled: false,
          vars: [],
          streams: [],
        },
      ] as any)
    ).toBe(true);
  });

  it('should return false if passed policy has Otelcol inputs and none are enabled', () => {
    expect(
      packagePolicyHasOtelInputs([
        {
          id: 'input1',
          type: 'otelcol',
          enabled: false,
          vars: [],
          streams: [],
        },
        {
          id: 'input2',
          type: 'otelcol',
          enabled: false,
          vars: [],
          streams: [],
        },
      ] as any)
    ).toBe(false);
  });

  it('should return false if passed policy has no Otelcol inputs', () => {
    expect(
      packagePolicyHasOtelInputs([
        {
          id: 'input1',
          enabled: true,
          vars: [],
          streams: [],
        },
        {
          id: 'input2',
          enabled: false,
          vars: [],
          streams: [],
        },
      ] as any)
    ).toBe(false);
  });

  it('should return false if passed policy is undefined', () => {
    expect(packagePolicyHasOtelInputs(undefined)).toBe(false);
  });
});

describe('packageInfoHasMultipleSignalTypes', () => {
  const otelPackageWithMultipleSignalTypes = {
    name: 'otel-input-package',
    version: '0.0.1',
    type: 'input',
    available_types: ['logs', 'metrics', 'traces'],
    policy_templates: [
      {
        name: 'template1',
        title: 'HTTP Check',
        input: 'otelcol',
        type: 'logs',
        template_path: 'input.yml.hbs',
        vars: [],
      },
    ],
  } as any as PackageInfo;

  const otelPackageWithSingleSignalType = {
    name: 'otel-input-package',
    version: '0.0.1',
    type: 'input',
    available_types: ['logs'],
    policy_templates: [
      {
        name: 'template1',
        title: 'HTTP Check',
        input: 'otelcol',
        type: 'logs',
        template_path: 'input.yml.hbs',
        vars: [],
      },
    ],
  } as any as PackageInfo;

  const otelPackageWithTwoSignalTypes = {
    name: 'otel-input-package',
    version: '0.0.1',
    type: 'input',
    available_types: ['logs', 'metrics'],
    policy_templates: [
      {
        name: 'template1',
        title: 'HTTP Check',
        input: 'otelcol',
        type: 'logs',
        template_path: 'input.yml.hbs',
        vars: [],
      },
    ],
  } as any as PackageInfo;

  const nonOtelPackageWithMultipleTypes = {
    name: 'non-otel-package',
    version: '0.0.1',
    type: 'input',
    available_types: ['logs', 'metrics', 'traces'],
    policy_templates: [
      {
        name: 'template1',
        title: 'Template 1',
        input: 'logfile',
        type: 'logs',
        template_path: 'input.yml.hbs',
        vars: [],
      },
    ],
  } as any as PackageInfo;

  it('should return true if package has OTel inputs and multiple signal types', () => {
    expect(packageInfoHasMultipleSignalTypes(otelPackageWithMultipleSignalTypes)).toBe(true);
  });

  it('should return true if package has OTel inputs and two signal types', () => {
    expect(packageInfoHasMultipleSignalTypes(otelPackageWithTwoSignalTypes)).toBe(true);
  });

  it('should return false if package has OTel inputs but only one signal type', () => {
    expect(packageInfoHasMultipleSignalTypes(otelPackageWithSingleSignalType)).toBe(false);
  });

  it('should return false if package has multiple signal types but no OTel inputs', () => {
    expect(packageInfoHasMultipleSignalTypes(nonOtelPackageWithMultipleTypes)).toBe(false);
  });

  it('should return false if package has no available_types', () => {
    const packageWithoutAvailableTypes = {
      ...otelPackageWithMultipleSignalTypes,
      available_types: undefined,
    } as any as PackageInfo;
    expect(packageInfoHasMultipleSignalTypes(packageWithoutAvailableTypes)).toBe(false);
  });

  it('should return false if package has empty available_types array', () => {
    const packageWithEmptyAvailableTypes = {
      ...otelPackageWithMultipleSignalTypes,
      available_types: [],
    } as any as PackageInfo;
    expect(packageInfoHasMultipleSignalTypes(packageWithEmptyAvailableTypes)).toBe(false);
  });

  it('should return false if undefined is passed', () => {
    expect(packageInfoHasMultipleSignalTypes(undefined)).toBe(false);
  });
});
