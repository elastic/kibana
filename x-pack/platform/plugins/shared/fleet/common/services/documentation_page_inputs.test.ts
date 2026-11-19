/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PackageInfo,
  RegistryPolicyInputOnlyTemplate,
  RegistryPolicyIntegrationTemplate,
} from '../types';

import { getDocumentationPageInputs } from './documentation_page_inputs';

const minimalIntegrationPkg = (
  partial: Partial<PackageInfo> & Pick<PackageInfo, 'policy_templates'>
): PackageInfo =>
  ({
    name: 'test_pkg',
    title: 'Test package',
    description: 'desc',
    version: '1.0.0',
    release: 'ga',
    type: 'integration',
    ...partial,
  } as PackageInfo);

describe('getDocumentationPageInputs', () => {
  it('uses distinct keys when two inputs share a type but have different names', () => {
    const nginxTemplate: RegistryPolicyIntegrationTemplate = {
      name: 'nginx',
      title: 'Nginx',
      description: 'd',
      inputs: [
        {
          type: 'filelog_otel',
          name: 'nginx-access',
          title: 'Access',
          description: '',
          vars: [],
        },
        {
          type: 'filelog_otel',
          name: 'nginx-error',
          title: 'Error',
          description: '',
          vars: [],
        },
      ],
    };

    const pkg = minimalIntegrationPkg({
      policy_templates: [nginxTemplate],
      data_streams: [],
    });

    const inputs = getDocumentationPageInputs(pkg);
    expect(inputs).toHaveLength(2);
    expect(inputs.map((i) => i.key)).toEqual(['nginx-access', 'nginx-error']);
  });

  it('prefixes keys with policy template name when the package has multiple integrations', () => {
    const t1: RegistryPolicyIntegrationTemplate = {
      name: 'nginx',
      title: 'Nginx',
      description: 'd',
      inputs: [{ type: 'logfile', title: 'L', description: '', vars: [] }],
    };
    const t2: RegistryPolicyIntegrationTemplate = {
      name: 'apache',
      title: 'Apache',
      description: 'd',
      inputs: [{ type: 'logfile', title: 'L', description: '', vars: [] }],
    };

    const pkg = minimalIntegrationPkg({
      policy_templates: [t1, t2],
      data_streams: [],
    });

    const inputs = getDocumentationPageInputs(pkg);
    expect(inputs.map((i) => i.key).sort()).toEqual(['apache-logfile', 'nginx-logfile']);
  });

  it('scopes streams to policy_template.data_streams paths when set', () => {
    const tmpl: RegistryPolicyIntegrationTemplate = {
      name: 'app',
      title: 'App',
      description: 'd',
      data_streams: ['ds1'],
      inputs: [{ type: 'logfile', title: 'Logs', description: '', vars: [] }],
    };

    const pkg = minimalIntegrationPkg({
      policy_templates: [tmpl],
      data_streams: [
        {
          path: 'ds1',
          type: 'logs',
          dataset: 'pkg.ds1',
          title: 'DS1',
          release: 'ga',
          package: 'test_pkg',
          streams: [{ input: 'logfile', title: 'S1', vars: [] }],
        },
        {
          path: 'ds2',
          type: 'logs',
          dataset: 'pkg.ds2',
          title: 'DS2',
          release: 'ga',
          package: 'test_pkg',
          streams: [{ input: 'logfile', title: 'S2', vars: [] }],
        },
      ],
    });

    const inputs = getDocumentationPageInputs(pkg);
    expect(inputs).toHaveLength(1);
    expect(inputs[0].streams).toHaveLength(1);
    expect(inputs[0].streams[0].data_stream.dataset).toBe('pkg.ds1');
  });

  it('includes all matching data streams when policy template has no data_streams paths', () => {
    const tmpl: RegistryPolicyIntegrationTemplate = {
      name: 'app',
      title: 'App',
      description: 'd',
      inputs: [{ type: 'logfile', title: 'Logs', description: '', vars: [] }],
    };

    const pkg = minimalIntegrationPkg({
      policy_templates: [tmpl],
      data_streams: [
        {
          path: 'ds1',
          type: 'logs',
          dataset: 'pkg.ds1',
          title: 'DS1',
          release: 'ga',
          package: 'test_pkg',
          streams: [{ input: 'logfile', title: 'S1', vars: [] }],
        },
        {
          path: 'ds2',
          type: 'logs',
          dataset: 'pkg.ds2',
          title: 'DS2',
          release: 'ga',
          package: 'test_pkg',
          streams: [{ input: 'logfile', title: 'S2', vars: [] }],
        },
      ],
    });

    const inputs = getDocumentationPageInputs(pkg);
    expect(inputs[0].streams).toHaveLength(2);
  });

  it('returns one input for an input-only policy template', () => {
    const inputOnly: RegistryPolicyInputOnlyTemplate = {
      input: 'logfile',
      type: 'logs',
      name: 'standalone',
      template_path: 'template.yml',
      title: 'Standalone input',
      description: 'd',
    };

    const pkg = minimalIntegrationPkg({
      policy_templates: [inputOnly],
      data_streams: [],
    });

    const inputs = getDocumentationPageInputs(pkg);
    expect(inputs).toHaveLength(1);
    expect(inputs[0].type).toBe('logfile');
    expect(inputs[0].key).toBe('logfile');
  });

  it('filters by integration name when provided', () => {
    const nginx: RegistryPolicyIntegrationTemplate = {
      name: 'nginx',
      title: 'Nginx',
      description: 'd',
      inputs: [{ type: 'logfile', title: 'L', description: '', vars: [] }],
    };
    const apache: RegistryPolicyIntegrationTemplate = {
      name: 'apache',
      title: 'Apache',
      description: 'd',
      inputs: [{ type: 'logfile', title: 'L', description: '', vars: [] }],
    };

    const pkg = minimalIntegrationPkg({
      policy_templates: [nginx, apache],
      data_streams: [],
    });

    expect(getDocumentationPageInputs(pkg, 'nginx')).toHaveLength(1);
    expect(getDocumentationPageInputs(pkg, 'nginx')[0].policy_template).toBe('nginx');
  });
});
