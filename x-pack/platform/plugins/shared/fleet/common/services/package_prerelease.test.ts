/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentlessDeploymentReleaseStatus } from '../types';
import type { RegistryPolicyTemplate } from '../types';

import {
  getPackageReleaseLabel,
  getAgentlessReleaseOverride,
  isPackagePrerelease,
  resolveEffectiveRelease,
} from './package_prerelease';

describe('isPackagePrerelease', () => {
  it('should return prerelease true for 0.1.0', () => {
    expect(isPackagePrerelease('0.1.0')).toBe(true);
  });

  it('should return prerelease false for 1.1.0', () => {
    expect(isPackagePrerelease('1.1.0')).toBe(false);
  });

  it('should return prerelease true for 1.0.0-preview', () => {
    expect(isPackagePrerelease('1.0.0-preview')).toBe(true);
  });

  it('should return prerelease true for 1.0.0-beta', () => {
    expect(isPackagePrerelease('1.0.0-beta')).toBe(true);
  });

  it('should return prerelease true for 1.0.0-rc', () => {
    expect(isPackagePrerelease('1.0.0-rc')).toBe(true);
  });

  it('should return prerelease true for 1.0.0-dev.0', () => {
    expect(isPackagePrerelease('1.0.0-dev.0')).toBe(true);
  });
});

describe('getPackageReleaseLabel', () => {
  it('should return preview for 0.1.0', () => {
    expect(getPackageReleaseLabel('0.1.0')).toEqual('preview');
  });

  it('should return ga for 1.1.0', () => {
    expect(getPackageReleaseLabel('1.1.0')).toEqual('ga');
  });

  it('should return preview for 1.0.0-preview1', () => {
    expect(getPackageReleaseLabel('1.0.0-preview1')).toEqual('preview');
  });

  it('should return beta for 1.0.0-beta', () => {
    expect(getPackageReleaseLabel('1.0.0-beta')).toEqual('beta');
  });

  it('should return rc for 1.0.0-rc', () => {
    expect(getPackageReleaseLabel('1.0.0-rc')).toEqual('rc');
  });

  it('should return beta for 1.0.0-dev.0', () => {
    expect(getPackageReleaseLabel('1.0.0-dev.0')).toBe('beta');
  });
});

const dualModeTemplate = (release?: AgentlessDeploymentReleaseStatus): RegistryPolicyTemplate =>
  ({
    name: 'tmpl',
    title: 'T',
    description: '',
    deployment_modes: {
      agentless: { enabled: true, release },
      default: { enabled: true },
    },
  } as RegistryPolicyTemplate);

const onlyAgentlessTemplate = (
  release?: AgentlessDeploymentReleaseStatus
): RegistryPolicyTemplate =>
  ({
    name: 'tmpl',
    title: 'T',
    description: '',
    deployment_modes: { agentless: { enabled: true, release } },
  } as RegistryPolicyTemplate);

describe('getAgentlessReleaseOverride', () => {
  it('should return undefined for a non-agentless package', () => {
    const packageInfo = {
      policy_templates: [
        { name: 'tmpl', deployment_modes: { default: { enabled: true } } },
      ] as RegistryPolicyTemplate[],
      version: '1.0.0',
    };
    expect(getAgentlessReleaseOverride(packageInfo, 'tmpl')).toBeUndefined();
  });

  it('should return undefined for a dual-mode integration without agentless context', () => {
    const packageInfo = {
      policy_templates: [dualModeTemplate(AgentlessDeploymentReleaseStatus.Beta)],
      version: '1.0.0',
    };
    expect(getAgentlessReleaseOverride(packageInfo, 'tmpl')).toBeUndefined();
  });

  it('should return beta for an only-agentless template in a multi-template package', () => {
    const packageInfo = {
      policy_templates: [
        dualModeTemplate(),
        {
          name: 'agentless_only',
          title: 'T',
          description: '',
          deployment_modes: {
            agentless: { enabled: true, release: AgentlessDeploymentReleaseStatus.Beta },
          },
        } as RegistryPolicyTemplate,
      ],
      version: '1.0.0',
    };
    expect(getAgentlessReleaseOverride(packageInfo, 'agentless_only')).toBe(
      AgentlessDeploymentReleaseStatus.Beta
    );
  });

  it('should return undefined for a single only-agentless template (defers to semver)', () => {
    const packageInfo = {
      policy_templates: [onlyAgentlessTemplate(AgentlessDeploymentReleaseStatus.Beta)],
      version: '1.0.0',
    };
    expect(getAgentlessReleaseOverride(packageInfo, 'tmpl')).toBeUndefined();
  });
});

describe('resolveEffectiveRelease', () => {
  it('should return ga when packageInfo is undefined', () => {
    expect(resolveEffectiveRelease(undefined)).toBe('ga');
  });

  it('should fall through to semver for a dual-mode integration without agentless context', () => {
    const packageInfo = {
      policy_templates: [dualModeTemplate(AgentlessDeploymentReleaseStatus.GA)],
      version: '1.0.0',
    };
    expect(resolveEffectiveRelease(packageInfo, 'tmpl')).toBe('ga');
  });

  it('should fall through to semver for a dual-mode integration with preview semver', () => {
    const packageInfo = {
      policy_templates: [dualModeTemplate(AgentlessDeploymentReleaseStatus.GA)],
      version: '1.0.0-preview',
    };
    expect(resolveEffectiveRelease(packageInfo, 'tmpl')).toBe('preview');
  });

  it('should return beta via isAgentlessContext when package is dual-mode with beta release', () => {
    const packageInfo = {
      policy_templates: [dualModeTemplate(AgentlessDeploymentReleaseStatus.Beta)],
      version: '1.0.0',
    };
    expect(resolveEffectiveRelease(packageInfo, 'tmpl', { isAgentlessContext: true })).toBe('beta');
  });

  it('should return ga when single only-agentless template defers to semver', () => {
    const packageInfo = {
      policy_templates: [onlyAgentlessTemplate()],
      version: '1.0.0',
    };
    expect(resolveEffectiveRelease(packageInfo, 'tmpl')).toBe('ga');
  });

  it('should derive release from semver when no agentless context applies', () => {
    const packageInfo = {
      policy_templates: [
        { name: 'tmpl', deployment_modes: { default: { enabled: true } } },
      ] as RegistryPolicyTemplate[],
      version: '1.0.0-preview',
    };
    expect(resolveEffectiveRelease(packageInfo)).toBe('preview');
  });
});
