/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RegistryPolicyInputOnlyTemplate,
  RegistryPolicyIntegrationTemplate,
  PackageInfo,
  RegistryVarType,
  PackageListItem,
  RegistryDataStream,
} from '../types';

import { OTEL_COLLECTOR_INPUT_TYPE } from '../constants';

import type { NewPackagePolicy } from '../types';

import {
  isInputOnlyPolicyTemplate,
  isIntegrationPolicyTemplate,
  getNormalizedInputs,
  getNormalizedDataStreams,
  filterPolicyTemplatesTiles,
  hasMultipleEnabledPolicyTemplates,
  getPolicyTemplateInputDefinition,
  registryInputAllowsDynamicSignalTypes,
  packagePolicyInputAllowsUndefinedDataStreamType,
  hasDynamicSignalTypes,
  shouldIncludeUseAPMVar,
} from './policy_template';

describe('isInputOnlyPolicyTemplate', () => {
  it('should return true input only policy template', () => {
    const inputOnlyPolicyTemplate: RegistryPolicyInputOnlyTemplate = {
      input: 'string',
      type: 'foo',
      name: 'bar',
      template_path: 'some/path.hbl',
      title: 'hello',
      description: 'desc',
    };
    expect(isInputOnlyPolicyTemplate(inputOnlyPolicyTemplate)).toEqual(true);
  });
  it('should return true for input only policy template with dynamic_signal_types and no type', () => {
    const inputOnlyPolicyTemplate: RegistryPolicyInputOnlyTemplate = {
      input: 'otelcol',
      name: 'otel',
      template_path: 'otel/otel.hbl',
      title: 'OTel',
      description: 'OTel input',
      dynamic_signal_types: true,
    };
    expect(isInputOnlyPolicyTemplate(inputOnlyPolicyTemplate)).toEqual(true);
  });
  it('should return false for empty integration policy template', () => {
    const emptyIntegrationTemplate: RegistryPolicyIntegrationTemplate = {
      inputs: [],
      name: 'bar',
      title: 'hello',
      description: 'desc',
    };
    expect(isInputOnlyPolicyTemplate(emptyIntegrationTemplate)).toEqual(false);
  });
  it('should return false for integration policy template with inputs', () => {
    const integrationTemplate: RegistryPolicyIntegrationTemplate = {
      inputs: [
        {
          type: 'foo',
          title: 'myFoo',
          description: 'myFoo',
          vars: [],
        },
      ],
      name: 'bar',
      title: 'hello',
      description: 'desc',
    };
    expect(isInputOnlyPolicyTemplate(integrationTemplate)).toEqual(false);
  });
});
describe('isIntegrationPolicyTemplate', () => {
  it('should return true input only policy template', () => {
    const inputOnlyPolicyTemplate: RegistryPolicyInputOnlyTemplate = {
      input: 'string',
      type: 'foo',
      name: 'bar',
      template_path: 'some/path.hbl',
      title: 'hello',
      description: 'desc',
    };
    expect(isIntegrationPolicyTemplate(inputOnlyPolicyTemplate)).toEqual(false);
  });
  it('should return false for empty integration policy template', () => {
    const emptyIntegrationTemplate: RegistryPolicyIntegrationTemplate = {
      inputs: [],
      name: 'bar',
      title: 'hello',
      description: 'desc',
    };
    expect(isIntegrationPolicyTemplate(emptyIntegrationTemplate)).toEqual(true);
  });
  it('should return false for integration policy template with inputs', () => {
    const integrationTemplate: RegistryPolicyIntegrationTemplate = {
      inputs: [
        {
          type: 'foo',
          title: 'myFoo',
          description: 'myFoo',
          vars: [],
        },
      ],
      name: 'bar',
      title: 'hello',
      description: 'desc',
    };
    expect(isIntegrationPolicyTemplate(integrationTemplate)).toEqual(true);
  });
});

describe('getNormalizedInputs', () => {
  it('should return empty array if template has no inputs', () => {
    const emptyIntegrationTemplate: RegistryPolicyIntegrationTemplate = {
      inputs: [],
      name: 'bar',
      title: 'hello',
      description: 'desc',
    };

    expect(getNormalizedInputs(emptyIntegrationTemplate)).toEqual([]);
  });
  it('should return inputs if there are any', () => {
    const emptyIntegrationTemplate: RegistryPolicyIntegrationTemplate = {
      inputs: [
        {
          type: 'foo',
          title: 'myFoo',
          description: 'myFoo',
          vars: [],
        },
      ],
      name: 'bar',
      title: 'hello',
      description: 'desc',
    };

    expect(getNormalizedInputs(emptyIntegrationTemplate)).toEqual([
      {
        type: 'foo',
        title: 'myFoo',
        description: 'myFoo',
        vars: [],
      },
    ]);
  });
  it('should return array with one input for input only', () => {
    const inputOnlyTemplate: RegistryPolicyInputOnlyTemplate = {
      input: 'string',
      type: 'foo',
      name: 'bar',
      template_path: 'some/path.hbl',
      title: 'myFoo',
      description: 'myFoo',
    };

    expect(getNormalizedInputs(inputOnlyTemplate)).toEqual([
      {
        type: 'string',
        title: 'myFoo',
        description: 'myFoo',
      },
    ]);
  });
});

describe('shouldIncludeUseAPMVar', () => {
  const otelcol = OTEL_COLLECTOR_INPUT_TYPE;

  it('returns true for OTel input with traces type', () => {
    expect(shouldIncludeUseAPMVar(otelcol, 'traces', false)).toBe(true);
  });

  it('returns true for OTel input with dynamic_signal_types regardless of stream type', () => {
    expect(shouldIncludeUseAPMVar(otelcol, 'logs', true)).toBe(true);
    expect(shouldIncludeUseAPMVar(otelcol, 'metrics', true)).toBe(true);
  });

  it('returns false for OTel input with non-traces type and no dynamic_signal_types', () => {
    expect(shouldIncludeUseAPMVar(otelcol, 'logs', false)).toBe(false);
    expect(shouldIncludeUseAPMVar(otelcol, 'metrics', false)).toBe(false);
  });

  it('returns false for non-OTel input type regardless of stream type', () => {
    expect(shouldIncludeUseAPMVar('logfile', 'traces', false)).toBe(false);
    expect(shouldIncludeUseAPMVar('logfile', 'traces', true)).toBe(false);
  });
});

describe('getNormalizedDataStreams', () => {
  const integrationPkg: PackageInfo = {
    name: 'nginx',
    title: 'Nginx',
    version: '1.3.0',
    release: 'ga',
    description: 'Collect logs and metrics from Nginx HTTP servers with Elastic Agent.',
    format_version: '',
    owner: { github: '' },
    assets: {} as any,
    policy_templates: [],
    data_streams: [
      {
        type: 'logs',
        dataset: 'nginx.access',
        title: 'Nginx access logs',
        release: 'experimental',
        ingest_pipeline: 'default',
        streams: [
          {
            input: 'logfile',
            vars: [
              {
                name: 'paths',
                type: 'text',
                title: 'Paths',
                multi: true,
                required: true,
                show_user: true,
                default: ['/var/log/nginx/access.log*'],
              },
            ],
            template_path: 'stream.yml.hbs',
            title: 'Nginx access logs',
            description: 'Collect Nginx access logs',
            enabled: true,
          },
        ],
        package: 'nginx',
        path: 'access',
      },
    ],
    latestVersion: '1.3.0',
    keepPoliciesUpToDate: false,
    status: 'not_installed',
  };
  it('should return data_streams for integration package', () => {
    expect(getNormalizedDataStreams(integrationPkg)).toEqual(integrationPkg.data_streams);
  });
  it('should return data_streams for integration package with type specified', () => {
    expect(getNormalizedDataStreams({ ...integrationPkg, type: 'integration' })).toEqual(
      integrationPkg.data_streams
    );
  });
  it('should return data_streams for empty integration package', () => {
    expect(getNormalizedDataStreams({ ...integrationPkg, data_streams: [] })).toEqual([]);
  });
  it('should build data streams for input only package', () => {
    expect(
      getNormalizedDataStreams({
        ...integrationPkg,
        type: 'input',
        policy_templates: [
          {
            input: 'string',
            type: 'foo',
            name: 'bar',
            template_path: 'some/path.hbl',
            title: 'myFoo',
            description: 'myFoo',
            vars: [],
          },
        ],
      })
    ).toEqual([
      {
        type: 'foo',
        dataset: 'nginx.bar',
        elasticsearch: {
          dynamic_dataset: true,
          dynamic_namespace: true,
        },
        title: expect.any(String),
        release: 'ga',
        package: 'nginx',
        path: 'nginx.bar',
        streams: [
          {
            input: 'string',
            vars: expect.any(Array),
            template_path: 'some/path.hbl',
            title: 'myFoo',
            description: 'myFoo',
            enabled: true,
          },
        ],
      },
    ]);
  });
  it('should not add dataset if already present', () => {
    const datasetVar = {
      name: 'data_stream.dataset',
      type: 'text' as RegistryVarType,
      title: 'local dataset',
      description: 'some desc',
      multi: false,
      required: true,
      show_user: true,
    };
    const result = getNormalizedDataStreams({
      ...integrationPkg,
      type: 'input',
      policy_templates: [
        {
          input: 'string',
          type: 'foo',
          name: 'bar',
          template_path: 'some/path.hbl',
          title: 'myFoo',
          description: 'myFoo',
          vars: [datasetVar],
        },
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0].streams).toHaveLength(1);
    expect(result?.[0].streams?.[0]?.vars).toEqual([datasetVar]);
  });

  const inputPkg: PackageInfo = {
    name: 'log',
    type: 'input',
    title: 'Custom logs',
    version: '2.4.0',
    description: 'Collect custom logs with Elastic Agent.',
    format_version: '3.1.5',
    owner: { github: '' },
    assets: {} as any,
    data_streams: [],
    policy_templates: [
      {
        name: 'logs',
        type: 'logs',
        title: 'Custom log file',
        description: 'Collect logs from custom files.',
        input: 'logfile',
        template_path: 'input.yml.hbs',
        vars: [
          {
            name: 'paths',
            type: 'text',
            title: 'Paths',
            multi: true,
            required: true,
            show_user: true,
            default: ['/var/log/nginx/access.log*'],
          },
        ],
      },
    ],
    latestVersion: '1.3.0',
    keepPoliciesUpToDate: false,
    status: 'not_installed',
  };
  const expectedInputPackageDataStream: RegistryDataStream = {
    type: 'logs',
    dataset: 'log.logs',
    elasticsearch: {
      dynamic_dataset: true,
      dynamic_namespace: true,
    },
    title: expect.any(String),
    release: 'ga',
    package: 'log',
    path: 'log.logs',
    streams: [
      {
        input: 'logfile',
        vars: expect.any(Array),
        template_path: 'input.yml.hbs',
        title: 'Custom log file',
        description: 'Custom log file',
        enabled: true,
      },
    ],
  };
  it('should build data streams for input package', () => {
    expect(getNormalizedDataStreams(inputPkg)).toEqual([expectedInputPackageDataStream]);
  });
  it('should use user-defined data stream type in input package', () => {
    expect(getNormalizedDataStreams(inputPkg, undefined, 'metrics')).toEqual([
      {
        ...expectedInputPackageDataStream,
        type: 'metrics',
      },
    ]);
  });

  it('should add use_apm var with default true for otel traces input', () => {
    const result = getNormalizedDataStreams({
      ...integrationPkg,
      type: 'input',
      policy_templates: [
        {
          input: 'otelcol',
          type: 'traces',
          name: 'otel-traces',
          template_path: 'some/path.hbl',
          title: 'OTel Traces',
          description: 'OTel Traces',
          vars: [],
        },
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0].streams).toHaveLength(1);
    const vars = result[0].streams![0].vars;
    const useApmVar = vars?.find((v) => v.name === 'use_apm');
    expect(useApmVar).toBeDefined();
    expect(useApmVar?.default).toEqual(true);
    expect(useApmVar?.title).toEqual('Enable Elastic APM Enrichment');
  });

  it('should add use_apm var when otel input has dynamic_signal_types true', () => {
    const result = getNormalizedDataStreams({
      ...integrationPkg,
      type: 'input',
      policy_templates: [
        {
          input: 'otelcol',
          type: 'logs',
          name: 'otel-dynamic',
          template_path: 'some/path.hbl',
          title: 'OTel Dynamic',
          description: 'OTel with dynamic signal types',
          dynamic_signal_types: true,
          vars: [],
        },
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0].streams).toHaveLength(1);
    const vars = result[0].streams![0].vars;
    const useApmVar = vars?.find((v) => v.name === 'use_apm');
    expect(useApmVar).toBeDefined();
    expect(useApmVar?.default).toEqual(true);
  });

  it('should return data stream with undefined type when dynamic_signal_types true and type omitted', () => {
    const result = getNormalizedDataStreams({
      ...integrationPkg,
      type: 'input',
      policy_templates: [
        {
          input: 'otelcol',
          name: 'otel-dynamic',
          template_path: 'some/path.hbl',
          title: 'OTel Dynamic',
          description: 'OTel with dynamic signal types',
          dynamic_signal_types: true,
          vars: [],
        },
      ] as any,
    });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBeUndefined();
    expect(result[0].streams).toHaveLength(1);
    const useApmVar = result[0].streams![0].vars?.find((v) => v.name === 'use_apm');
    expect(useApmVar).toBeDefined();
    expect(useApmVar?.default).toEqual(true);
  });

  it('should derive default dataset from packageName.templateName regardless of dynamic_signal_types', () => {
    const makePkg = (name: string, dynamicSignalTypes?: boolean) =>
      getNormalizedDataStreams({
        ...integrationPkg,
        type: 'input',
        policy_templates: [
          {
            input: 'otelcol',
            name,
            template_path: 'some/path.hbl',
            title: name,
            description: name,
            ...(dynamicSignalTypes !== undefined
              ? { dynamic_signal_types: dynamicSignalTypes }
              : {}),
            vars: [],
          },
        ],
      });

    // dynamic_signal_types: true — same createDefaultDatasetName behaviour as non-dynamic
    expect(makePkg('otlpreceiver', true)[0].dataset).toEqual('nginx.otlpreceiver');
    expect(makePkg('otlpreceiver', true)[0].path).toEqual('nginx.otlpreceiver');

    // dynamic_signal_types: false / absent — same behaviour
    expect(makePkg('mysqlreceiver', false)[0].dataset).toEqual('nginx.mysqlreceiver');
    expect(makePkg('mysqlreceiver')[0].dataset).toEqual('nginx.mysqlreceiver');
  });
});

describe('getNormalizedInputs - dynamic_signal_types propagation', () => {
  it('should propagate dynamic_signal_types from input-only template into the returned RegistryInput', () => {
    const template: RegistryPolicyInputOnlyTemplate = {
      input: 'otelcol',
      name: 'otel-dynamic',
      template_path: 'some/path.hbl',
      title: 'OTel Dynamic',
      description: 'OTel with dynamic signal types',
      dynamic_signal_types: true,
    };
    const [normalized] = getNormalizedInputs(template);
    expect(normalized.type).toEqual('otelcol');
    expect(normalized.dynamic_signal_types).toEqual(true);
  });

  it('should not include dynamic_signal_types when it is not set on input-only template', () => {
    const template: RegistryPolicyInputOnlyTemplate = {
      input: 'logfile',
      name: 'logfile-template',
      type: 'logs',
      template_path: 'some/path.hbl',
      title: 'Logfile',
      description: 'Logfile input',
    };
    const [normalized] = getNormalizedInputs(template);
    expect(normalized.dynamic_signal_types).toBeUndefined();
  });

  it('should return integration inputs as-is including dynamic_signal_types', () => {
    const template: RegistryPolicyIntegrationTemplate = {
      name: 'composable-otel',
      title: 'Composable OTel',
      description: 'Composable integration with OTel input',
      inputs: [
        {
          type: 'otelcol',
          title: 'OTel Collector',
          description: 'OTel Collector input',
          dynamic_signal_types: true,
        },
        {
          type: 'logfile',
          title: 'Logfile',
          description: 'Regular logfile input',
        },
      ],
    };
    const result = getNormalizedInputs(template);
    expect(result).toHaveLength(2);
    expect(result[0].dynamic_signal_types).toEqual(true);
    expect(result[1].dynamic_signal_types).toBeUndefined();
  });
});

describe('registryInputAllowsDynamicSignalTypes', () => {
  it('returns true for OTel collector input with dynamic_signal_types: true', () => {
    expect(
      registryInputAllowsDynamicSignalTypes({
        type: 'otelcol',
        title: 'OTel',
        description: 'OTel',
        dynamic_signal_types: true,
      })
    ).toBe(true);
  });

  it('returns false for OTel collector input without dynamic_signal_types', () => {
    expect(
      registryInputAllowsDynamicSignalTypes({
        type: 'otelcol',
        title: 'OTel',
        description: 'OTel',
      })
    ).toBe(false);
  });

  it('returns true for any input type with dynamic_signal_types: true', () => {
    expect(
      registryInputAllowsDynamicSignalTypes({
        type: 'logfile',
        title: 'Logfile',
        description: 'Logfile',
        dynamic_signal_types: true,
      })
    ).toBe(true);
  });
});

describe('getPolicyTemplateInputDefinition', () => {
  it('returns the synthesized RegistryInput for an input-only template', () => {
    const template: RegistryPolicyInputOnlyTemplate = {
      input: 'otelcol',
      name: 'otel',
      template_path: 'some/path.hbl',
      title: 'OTel',
      description: 'OTel input',
      dynamic_signal_types: true,
    };
    const def = getPolicyTemplateInputDefinition(template);
    expect(def).toBeDefined();
    expect(def!.type).toEqual('otelcol');
    expect(def!.dynamic_signal_types).toEqual(true);
  });

  it('returns the matching input from integration template by inputType', () => {
    const template: RegistryPolicyIntegrationTemplate = {
      name: 'composable',
      title: 'Composable',
      description: 'desc',
      inputs: [
        {
          type: 'otelcol',
          title: 'OTel',
          description: 'OTel',
          dynamic_signal_types: true,
        },
        { type: 'logfile', title: 'Logfile', description: 'Logfile' },
      ],
    };
    const def = getPolicyTemplateInputDefinition(template, 'otelcol');
    expect(def).toBeDefined();
    expect(def!.dynamic_signal_types).toEqual(true);
  });

  it('returns undefined for integration template when inputType is not found', () => {
    const template: RegistryPolicyIntegrationTemplate = {
      name: 'composable',
      title: 'Composable',
      description: 'desc',
      inputs: [{ type: 'logfile', title: 'Logfile', description: 'Logfile' }],
    };
    expect(getPolicyTemplateInputDefinition(template, 'otelcol')).toBeUndefined();
  });

  it('returns undefined for integration template when no inputType is provided', () => {
    const template: RegistryPolicyIntegrationTemplate = {
      name: 'composable',
      title: 'Composable',
      description: 'desc',
      inputs: [{ type: 'logfile', title: 'Logfile', description: 'Logfile' }],
    };
    expect(getPolicyTemplateInputDefinition(template)).toBeUndefined();
  });
});

describe('packagePolicyInputAllowsUndefinedDataStreamType', () => {
  const basePackageInfo = {
    name: 'test-pkg',
    version: '1.0.0',
    title: 'Test',
    description: 'Test',
    release: 'ga' as const,
    format_version: '1.0.0',
    owner: { github: 'elastic' },
    status: 'not_installed' as const,
  } as PackageInfo;

  it('returns true for input-only package with dynamic OTel input', () => {
    const pkg: PackageInfo = {
      ...basePackageInfo,
      type: 'input',
      policy_templates: [
        {
          input: 'otelcol',
          name: 'otel',
          template_path: 'path.hbl',
          title: 'OTel',
          description: 'OTel',
          dynamic_signal_types: true,
        },
      ],
    } as any;
    expect(
      packagePolicyInputAllowsUndefinedDataStreamType(pkg, {
        type: 'otelcol',
        policy_template: undefined,
      })
    ).toBe(true);
  });

  it('returns false for input-only package with non-dynamic input', () => {
    const pkg: PackageInfo = {
      ...basePackageInfo,
      type: 'input',
      policy_templates: [
        {
          input: 'logfile',
          type: 'logs',
          name: 'logfile',
          template_path: 'path.hbl',
          title: 'Logfile',
          description: 'Logfile',
        },
      ],
    } as any;
    expect(packagePolicyInputAllowsUndefinedDataStreamType(pkg, { type: 'logfile' })).toBe(false);
  });

  it('returns true for composable integration package with dynamic OTel nested input', () => {
    const pkg: PackageInfo = {
      ...basePackageInfo,
      type: 'integration',
      policy_templates: [
        {
          name: 'composable-otel',
          title: 'Composable OTel',
          description: 'desc',
          inputs: [
            {
              type: 'otelcol',
              title: 'OTel',
              description: 'OTel',
              dynamic_signal_types: true,
            },
            { type: 'logfile', title: 'Logfile', description: 'Logfile' },
          ],
        },
      ],
    } as any;
    expect(
      packagePolicyInputAllowsUndefinedDataStreamType(pkg, {
        type: 'otelcol',
        policy_template: 'composable-otel',
      })
    ).toBe(true);
  });

  it('returns false for composable integration package when the logfile input is checked', () => {
    const pkg: PackageInfo = {
      ...basePackageInfo,
      type: 'integration',
      policy_templates: [
        {
          name: 'composable-otel',
          title: 'Composable OTel',
          description: 'desc',
          inputs: [
            {
              type: 'otelcol',
              title: 'OTel',
              description: 'OTel',
              dynamic_signal_types: true,
            },
            { type: 'logfile', title: 'Logfile', description: 'Logfile' },
          ],
        },
      ],
    } as any;
    expect(
      packagePolicyInputAllowsUndefinedDataStreamType(pkg, {
        type: 'logfile',
        policy_template: 'composable-otel',
      })
    ).toBe(false);
  });

  it('returns false for composable integration when another policy template defines dynamic logfile but input uses the plain template', () => {
    const pkg: PackageInfo = {
      ...basePackageInfo,
      type: 'integration',
      policy_templates: [
        {
          name: 'template_a',
          title: 'Template A',
          description: 'desc',
          inputs: [
            {
              type: 'logfile',
              title: 'Log file',
              description: 'Log file',
              dynamic_signal_types: true,
            },
          ],
        },
        {
          name: 'template_b',
          title: 'Template B',
          description: 'desc',
          inputs: [{ type: 'logfile', title: 'Log file', description: 'Log file' }],
        },
      ],
    } as any;
    expect(
      packagePolicyInputAllowsUndefinedDataStreamType(pkg, {
        type: 'logfile',
        policy_template: 'template_b',
      })
    ).toBe(false);
  });

  // Input packages normally declare one policy template; if multiple input-only templates were present,
  // httpjson must not pick up otelcol's dynamic_signal_types (same selection rule the stream UI mirrors).
  it('with multiple input-only policy templates, matches template by input type for dynamic_signal_types', () => {
    const pkg: PackageInfo = {
      ...basePackageInfo,
      type: 'input',
      policy_templates: [
        {
          input: 'otelcol',
          name: 'otel',
          template_path: 'otel.yml.hbs',
          title: 'OTel',
          description: 'OTel',
          dynamic_signal_types: true,
        },
        {
          input: 'httpjson',
          name: 'httpjson',
          type: 'logs',
          template_path: 'httpjson.yml.hbs',
          title: 'HTTP JSON',
          description: 'HTTP JSON',
          vars: [],
        },
      ],
    } as any;
    expect(
      packagePolicyInputAllowsUndefinedDataStreamType(pkg, {
        type: 'httpjson',
        policy_template: undefined,
      })
    ).toBe(false);
  });
});

describe('filterPolicyTemplatesTiles', () => {
  const topPackagePolicy: PackageListItem = {
    id: 'nginx',
    integration: 'nginx',
    title: 'Nginx',
    name: 'nginx',
    version: '0.0.1',
    status: 'not_installed',
  };

  const childPolicyTemplates: PackageListItem[] = [
    {
      id: 'nginx-template1',
      integration: 'nginx-template-1',
      title: 'Nginx Template 1',
      name: 'nginx',
      version: '0.0.1',
      status: 'not_installed',
    },
    {
      id: 'nginx-template2',
      integration: 'nginx-template-2',
      title: 'Nginx Template 2',
      name: 'nginx',
      version: '0.0.1',
      status: 'not_installed',
    },
  ];
  it('should return all tiles as undefined value', () => {
    expect(filterPolicyTemplatesTiles(undefined, topPackagePolicy, childPolicyTemplates)).toEqual([
      {
        id: 'nginx',
        integration: 'nginx',
        title: 'Nginx',
        name: 'nginx',
        version: '0.0.1',
        status: 'not_installed',
      },
      {
        id: 'nginx-template1',
        integration: 'nginx-template-1',
        title: 'Nginx Template 1',
        name: 'nginx',
        version: '0.0.1',
        status: 'not_installed',
      },
      {
        id: 'nginx-template2',
        integration: 'nginx-template-2',
        title: 'Nginx Template 2',
        name: 'nginx',
        version: '0.0.1',
        status: 'not_installed',
      },
    ]);
  });
  it('should return all tiles', () => {
    expect(filterPolicyTemplatesTiles('all', topPackagePolicy, childPolicyTemplates)).toEqual([
      {
        id: 'nginx',
        integration: 'nginx',
        title: 'Nginx',
        name: 'nginx',
        version: '0.0.1',
        status: 'not_installed',
      },
      {
        id: 'nginx-template1',
        integration: 'nginx-template-1',
        title: 'Nginx Template 1',
        name: 'nginx',
        version: '0.0.1',
        status: 'not_installed',
      },
      {
        id: 'nginx-template2',
        integration: 'nginx-template-2',
        title: 'Nginx Template 2',
        name: 'nginx',
        version: '0.0.1',
        status: 'not_installed',
      },
    ]);
  });
  it('should return just the combined policy tile', () => {
    expect(
      filterPolicyTemplatesTiles('combined_policy', topPackagePolicy, childPolicyTemplates)
    ).toEqual([
      {
        id: 'nginx',
        integration: 'nginx',
        title: 'Nginx',
        name: 'nginx',
        version: '0.0.1',
        status: 'not_installed',
      },
    ]);
  });
  it('should return just the individual policies (tiles)', () => {
    expect(
      filterPolicyTemplatesTiles('individual_policies', topPackagePolicy, childPolicyTemplates)
    ).toEqual([
      {
        id: 'nginx-template1',
        integration: 'nginx-template-1',
        title: 'Nginx Template 1',
        name: 'nginx',
        version: '0.0.1',
        status: 'not_installed',
      },
      {
        id: 'nginx-template2',
        integration: 'nginx-template-2',
        title: 'Nginx Template 2',
        name: 'nginx',
        version: '0.0.1',
        status: 'not_installed',
      },
    ]);
  });
});

describe('hasMultipleEnabledPolicyTemplates', () => {
  const makePackagePolicy = (
    inputs: Array<{ type: string; policy_template?: string; enabled: boolean }>
  ): NewPackagePolicy => ({
    name: 'test-policy',
    namespace: 'default',
    enabled: true,
    policy_ids: ['policy-1'],
    inputs: inputs.map((input) => ({
      ...input,
      streams: [],
    })),
  });

  it('should return false when all enabled inputs belong to a single policy template', () => {
    const packagePolicy = makePackagePolicy([
      { type: 'logfile', policy_template: 'template_a', enabled: true },
      { type: 'metrics', policy_template: 'template_a', enabled: true },
    ]);
    expect(hasMultipleEnabledPolicyTemplates(packagePolicy)).toBe(false);
  });

  it('should return true when enabled inputs span multiple policy templates', () => {
    const packagePolicy = makePackagePolicy([
      { type: 'logfile', policy_template: 'template_a', enabled: true },
      { type: 'httpjson', policy_template: 'template_b', enabled: true },
    ]);
    expect(hasMultipleEnabledPolicyTemplates(packagePolicy)).toBe(true);
  });

  it('should return false when inputs span multiple templates but only one template is enabled', () => {
    const packagePolicy = makePackagePolicy([
      { type: 'logfile', policy_template: 'template_a', enabled: true },
      { type: 'httpjson', policy_template: 'template_b', enabled: false },
    ]);
    expect(hasMultipleEnabledPolicyTemplates(packagePolicy)).toBe(false);
  });

  it('should return false when there is a single enabled input with no policy_template', () => {
    const packagePolicy = makePackagePolicy([{ type: 'logfile', enabled: true }]);
    expect(hasMultipleEnabledPolicyTemplates(packagePolicy)).toBe(false);
  });

  it('should return false when there are no enabled inputs', () => {
    const packagePolicy = makePackagePolicy([
      { type: 'logfile', policy_template: 'template_a', enabled: false },
      { type: 'httpjson', policy_template: 'template_b', enabled: false },
    ]);
    expect(hasMultipleEnabledPolicyTemplates(packagePolicy)).toBe(false);
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
