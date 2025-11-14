/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OTEL_COLLECTOR_INPUT_TYPE } from '../constants';
import type { RegistryPolicyTemplate } from '../types';

import {
  getRootIntegrations,
  getRootPrivilegedDataStreams,
  hasInstallServersInputs,
  isRootPrivilegesRequired,
  checkIntegrationFipsLooseCompatibility,
  getNonFipsIntegrations,
  isRootPrivilegeRequired,
} from './package_helpers';

describe('isRootPrivilegesRequired', () => {
  it('should return true if root privileges is required at root level', () => {
    const res = isRootPrivilegesRequired({
      agent: {
        privileges: {
          root: true,
        },
      },
    } as any);
    expect(res).toBe(true);
  });
  it('should return true if root privileges is required at datastreams', () => {
    const res = isRootPrivilegesRequired({
      data_streams: [
        {
          agent: {
            privileges: { root: true },
          },
        },
      ],
    } as any);
    expect(res).toBe(true);
  });

  it('should return false if root privileges is not required', () => {
    const res = isRootPrivilegesRequired({
      data_streams: [],
    } as any);
    expect(res).toBe(false);
  });
});

describe('isRootPrivilegeRequired', () => {
  it('should return true if any package policy requires root', () => {
    const res = isRootPrivilegeRequired([
      {
        package: {
          requires_root: true,
        },
      } as any,
    ]);
    expect(res).toBe(true);
  });

  it('should return false if no package policy requires root', () => {
    const res = isRootPrivilegeRequired([
      {
        package: {
          requires_root: false,
        },
      } as any,
    ]);
    expect(res).toBe(false);
  });

  it('should return false if no package policies', () => {
    const res = isRootPrivilegeRequired([]);
    expect(res).toBe(false);
  });
});

describe('getRootPrivilegedDataStreams', () => {
  it('should return empty datastreams if root privileges is required at root level', () => {
    const res = getRootPrivilegedDataStreams({
      agent: {
        privileges: {
          root: true,
        },
      },
    } as any);
    expect(res).toEqual([]);
  });
  it('should return datastreams if root privileges is required at datastreams', () => {
    const res = getRootPrivilegedDataStreams({
      data_streams: [
        {
          name: 'syslog',
          title: 'System syslog logs',
          agent: {
            privileges: { root: true },
          },
        },
        {
          name: 'sysauth',
          title: 'System auth logs',
        },
      ],
    } as any);
    expect(res).toEqual([
      {
        name: 'syslog',
        title: 'System syslog logs',
      },
    ]);
  });
});

describe('getRootIntegrations', () => {
  it('should return packages that require root', () => {
    const res = getRootIntegrations([
      {
        package: {
          requires_root: true,
          name: 'auditd_manager',
          title: 'Auditd Manager',
        },
      } as any,
      {
        package: {
          requires_root: false,
          name: 'system',
          title: 'System',
        },
      } as any,
      {
        package: {
          name: 'test',
          title: 'Test',
        },
      } as any,
      {
        package: {
          requires_root: true,
          name: 'auditd_manager',
          title: 'Auditd Manager',
        },
      } as any,
      {} as any,
    ]);
    expect(res).toEqual([{ name: 'auditd_manager', title: 'Auditd Manager' }]);
  });

  it('should return empty array if no packages require root', () => {
    const res = getRootIntegrations([]);
    expect(res).toEqual([]);
  });
});

describe('hasInstallServersInputs', () => {
  it('should return true if any package policy has fleet-server input', () => {
    const res = hasInstallServersInputs([
      {
        inputs: [{ type: 'fleet-server' }],
      } as any,
    ]);
    expect(res).toBe(true);
  });

  it('should return true if any package policy has apm input', () => {
    const res = hasInstallServersInputs([
      {
        inputs: [{ type: 'apm' }],
      } as any,
    ]);
    expect(res).toBe(true);
  });

  it('should return true if any package policy has cloudbeat input', () => {
    const res = hasInstallServersInputs([
      {
        inputs: [{ type: 'cloudbeat/cis_aws' }],
      } as any,
    ]);
    expect(res).toBe(true);
  });

  it('should return false if no package policy has install servers inputs', () => {
    const res = hasInstallServersInputs([
      {
        inputs: [{ type: 'system' }],
      } as any,
    ]);
    expect(res).toBe(false);
  });
});

describe('checkIntegrationFipsLooseCompatibility', () => {
  const packageInfo = {
    policy_templates: [
      {
        name: 'test-package-1',
        title: 'Template 1',
        description: '',
        fips_compatible: true,
      },
      {
        name: 'test-package-2',
        title: 'Template 2',
        description: '',
      },
      {
        name: 'test-package-3',
        title: 'Template 3',
        description: '',
        fips_compatible: false,
      },
    ] as RegistryPolicyTemplate[],
  };

  it('should return true if an integration has no packageInfo', () => {
    const res = checkIntegrationFipsLooseCompatibility('test-package-1');
    expect(res).toBe(true);
  });

  it('should return true if an integration has no name specified', () => {
    const res = checkIntegrationFipsLooseCompatibility('');
    expect(res).toBe(true);
  });

  it('should return true if an integration has no policy_templates', () => {
    const res = checkIntegrationFipsLooseCompatibility('test-package-1', { policy_templates: [] });
    expect(res).toBe(true);
  });

  it('should return true if an integration has policy_templates marked as fips_compatible', () => {
    const res = checkIntegrationFipsLooseCompatibility('test-package-1', packageInfo);
    expect(res).toBe(true);
  });

  it('should return true if an integration has policy_templates with no fips_compatible flag', () => {
    const res = checkIntegrationFipsLooseCompatibility('test-package-2', packageInfo);
    expect(res).toBe(true);
  });

  it('should return false if an integration has policy_templates  marked as fips_compatible=false', () => {
    const res = checkIntegrationFipsLooseCompatibility('test-package-3', packageInfo);
    expect(res).toBe(false);
  });

  const otelPackageInfo = {
    policy_templates: [
      {
        name: 'test-package-otel-1',
        title: 'Template OTel 1',
        description: '',
        input: OTEL_COLLECTOR_INPUT_TYPE,
      },
      {
        name: 'test-package-otel-2',
        title: 'Template OTel 2',
        description: '',
        input: OTEL_COLLECTOR_INPUT_TYPE,
        fips_compatible: true,
      },
      {
        name: 'test-package-otel-3',
        title: 'Template OTel 3',
        description: '',
        inputs: [
          {
            type: OTEL_COLLECTOR_INPUT_TYPE,
          },
        ],
      },
      {
        name: 'test-package-otel-4',
        title: 'Template OTel 4',
        description: '',
        inputs: [
          {
            type: OTEL_COLLECTOR_INPUT_TYPE,
          },
        ],
        fips_compatible: true,
      },
    ] as RegistryPolicyTemplate[],
  };

  it('should return false if an OTel input is not explicitly marked as fips compatible', () => {
    const res = checkIntegrationFipsLooseCompatibility('test-package-otel-1', otelPackageInfo);
    expect(res).toBe(false);
  });

  it('should return true if an OTel input is marked as fips compatible', () => {
    const res = checkIntegrationFipsLooseCompatibility('test-package-otel-2', otelPackageInfo);
    expect(res).toBe(true);
  });

  it('should return false if an OTel integration is not explicitly marked as fips compatible', () => {
    const res = checkIntegrationFipsLooseCompatibility('test-package-otel-3', otelPackageInfo);
    expect(res).toBe(false);
  });

  it('should return true if an OTel integration is marked as fips compatible', () => {
    const res = checkIntegrationFipsLooseCompatibility('test-package-otel-4', otelPackageInfo);
    expect(res).toBe(true);
  });
});

describe('getNonFipsIntegrations', () => {
  it('should return packages that require root', () => {
    const res = getNonFipsIntegrations([
      {
        package: {
          fips_compatible: false,
          name: 'oracle',
          title: 'Oracle',
        },
      } as any,
      {
        package: {
          fips_compatible: false,
          name: 'mongodb',
          title: 'MongoDb',
        },
      } as any,
      {
        package: {
          name: 'test',
          title: 'Test',
        },
      } as any,
      {
        package: {
          fips_compatible: true,
          name: 'auditd_manager',
          title: 'Auditd Manager',
        },
      } as any,
      {} as any,
    ]);
    expect(res).toEqual([
      { name: 'oracle', title: 'Oracle' },
      { name: 'mongodb', title: 'MongoDb' },
    ]);
  });
});
