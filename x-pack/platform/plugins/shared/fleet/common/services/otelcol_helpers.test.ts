/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageInfo } from '../types';

import {
  packageInfoHasOtelInputs,
  hasDynamicSignalTypes,
  packagePolicyHasOtelInputs,
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

describe('hasDynamicSignalTypes', () => {
  it('should return true when OTel input has dynamic_signal_types: true', () => {
    const pkg = {
      policy_templates: [
        {
          name: 't',
          title: 't',
          input: 'otelcol',
          type: 'logs',
          template_path: 'input.yml.hbs',
          dynamic_signal_types: true,
        },
      ],
    } as any as PackageInfo;
    expect(hasDynamicSignalTypes(pkg)).toBe(true);
  });

  it('should return false when OTel input has dynamic_signal_types: false', () => {
    const pkg = {
      policy_templates: [
        {
          name: 't',
          title: 't',
          input: 'otelcol',
          type: 'logs',
          template_path: 'input.yml.hbs',
          dynamic_signal_types: false,
        },
      ],
    } as any as PackageInfo;
    expect(hasDynamicSignalTypes(pkg)).toBe(false);
  });

  it('should return false when OTel input has no dynamic_signal_types property', () => {
    const pkg = {
      policy_templates: [
        { name: 't', title: 't', input: 'otelcol', type: 'logs', template_path: 'input.yml.hbs' },
      ],
    } as any as PackageInfo;
    expect(hasDynamicSignalTypes(pkg)).toBe(false);
  });

  it('should return false when policyTemplateName does not match any template', () => {
    const pkg = {
      policy_templates: [
        {
          name: 'otel_template',
          title: 't',
          input: 'otelcol',
          type: 'logs',
          template_path: 'input.yml.hbs',
          dynamic_signal_types: true,
        },
      ],
    } as any as PackageInfo;
    expect(hasDynamicSignalTypes(pkg, { policyTemplateName: 'other_template' })).toBe(false);
  });

  it('should return true when scoped to the matching policyTemplateName', () => {
    const pkg = {
      policy_templates: [
        {
          name: 'otel_template',
          title: 't',
          input: 'otelcol',
          type: 'logs',
          template_path: 'input.yml.hbs',
          dynamic_signal_types: true,
        },
      ],
    } as any as PackageInfo;
    expect(hasDynamicSignalTypes(pkg, { policyTemplateName: 'otel_template' })).toBe(true);
  });

  it('should return false when packageInfo is undefined', () => {
    expect(hasDynamicSignalTypes(undefined)).toBe(false);
  });

  it('should return true for a composable template where any input has dynamic_signal_types', () => {
    const pkg = {
      policy_templates: [
        {
          name: 'my_template',
          title: 't',
          inputs: [
            { type: 'otelcol', title: 't', dynamic_signal_types: true },
            { type: 'logfile', title: 't' },
          ],
        },
      ],
    } as any as PackageInfo;
    expect(hasDynamicSignalTypes(pkg)).toBe(true);
  });

  it('should return true for a composable template scoped by inputType to the dynamic input', () => {
    const pkg = {
      policy_templates: [
        {
          name: 'my_template',
          title: 't',
          inputs: [
            { type: 'otelcol', title: 't', dynamic_signal_types: true },
            { type: 'logfile', title: 't' },
          ],
        },
      ],
    } as any as PackageInfo;
    expect(
      hasDynamicSignalTypes(pkg, { policyTemplateName: 'my_template', inputType: 'otelcol' })
    ).toBe(true);
  });

  it('should return false for a composable template scoped by inputType to a non-dynamic input', () => {
    const pkg = {
      policy_templates: [
        {
          name: 'my_template',
          title: 't',
          inputs: [
            { type: 'otelcol', title: 't', dynamic_signal_types: true },
            { type: 'logfile', title: 't' },
          ],
        },
      ],
    } as any as PackageInfo;
    expect(
      hasDynamicSignalTypes(pkg, { policyTemplateName: 'my_template', inputType: 'logfile' })
    ).toBe(false);
  });

  it('should scope to the correct template in a multi-template package', () => {
    const pkg = {
      policy_templates: [
        {
          name: 'otel_template',
          title: 't',
          input: 'otelcol',
          type: 'logs',
          template_path: 'input.yml.hbs',
          dynamic_signal_types: true,
        },
        {
          name: 'logfile_template',
          title: 't',
          input: 'logfile',
          type: 'logs',
          template_path: 'input.yml.hbs',
        },
      ],
    } as any as PackageInfo;
    expect(hasDynamicSignalTypes(pkg, { policyTemplateName: 'otel_template' })).toBe(true);
    expect(hasDynamicSignalTypes(pkg, { policyTemplateName: 'logfile_template' })).toBe(false);
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
