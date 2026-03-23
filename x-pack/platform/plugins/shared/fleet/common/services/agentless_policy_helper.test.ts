/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegistryPolicyTemplate } from '../types';

import {
  isAgentlessIntegration,
  getAgentlessAgentPolicyNameFromPackagePolicyName,
  isOnlyAgentlessIntegration,
  isOnlyAgentlessPolicyTemplate,
  isInputAllowedForDeploymentMode,
  validateDeploymentModesForInputs,
} from './agentless_policy_helper';

describe('agentless_policy_helper', () => {
  describe('isAgentlessIntegration', () => {
    it('should return true if packageInfo is defined and has at least one agentless integration', () => {
      const packageInfo = {
        policy_templates: [
          {
            name: 'template1',
            title: 'Template 1',
            description: '',
            deployment_modes: {
              default: {
                enabled: true,
              },
              agentless: {
                enabled: true,
              },
            },
          },
          {
            name: 'template2',
            title: 'Template 2',
            description: '',
            deployment_modes: {
              default: {
                enabled: true,
              },
            },
          },
        ] as RegistryPolicyTemplate[],
      };

      const result = isAgentlessIntegration(packageInfo);

      expect(result).toBe(true);
    });

    it('should return false if packageInfo is defined but does not have agentless integrations', () => {
      const packageInfo = {
        policy_templates: [
          {
            name: 'template1',
            title: 'Template 1',
            description: '',
            deployment_modes: {
              default: {
                enabled: true,
              },
              agentless: {
                enabled: false,
              },
            },
          },
          {
            name: 'template2',
            title: 'Template 2',
            description: '',
            deployment_modes: {
              default: {
                enabled: false,
              },
              agentless: {
                enabled: false,
              },
            },
          },
        ] as RegistryPolicyTemplate[],
      };

      const result = isAgentlessIntegration(packageInfo);

      expect(result).toBe(false);
    });

    it('should return false if packageInfo has no policy templates', () => {
      const packageInfo = {
        policy_templates: [],
      };

      const result = isAgentlessIntegration(packageInfo);

      expect(result).toBe(false);
    });

    it('should return false if packageInfo is undefined', () => {
      const packageInfo = undefined;

      const result = isAgentlessIntegration(packageInfo);

      expect(result).toBe(false);
    });

    it('should return true if the specified integration supports agentless', () => {
      const packageInfo = {
        policy_templates: [
          {
            name: 'template1',
            deployment_modes: {
              agentless: { enabled: true },
              default: { enabled: false },
            },
          },
          {
            name: 'template2',
            deployment_modes: {
              agentless: { enabled: false },
              default: { enabled: true },
            },
          },
        ] as RegistryPolicyTemplate[],
      };

      expect(isAgentlessIntegration(packageInfo, 'template1')).toBe(true);
      expect(isAgentlessIntegration(packageInfo, 'template2')).toBe(false);
    });

    it('should return false if the specified integration does not exist', () => {
      const packageInfo = {
        policy_templates: [
          {
            name: 'template1',
            deployment_modes: {
              agentless: { enabled: true },
              default: { enabled: false },
            },
          },
        ] as RegistryPolicyTemplate[],
      };

      expect(isAgentlessIntegration(packageInfo, 'nonexistent')).toBe(false);
    });

    it('should return false if the specified integration exists but has no deployment_modes', () => {
      const packageInfo = {
        policy_templates: [
          {
            name: 'template1',
          },
        ] as RegistryPolicyTemplate[],
      };

      expect(isAgentlessIntegration(packageInfo, 'template1')).toBe(false);
    });
  });

  describe('getAgentlessAgentPolicyNameFromPackagePolicyName', () => {
    it('should return the agentless agent policy name based on the package policy name', () => {
      const packagePolicyName = 'example-package-policy';

      const result = getAgentlessAgentPolicyNameFromPackagePolicyName(packagePolicyName);

      expect(result).toBe('Agentless policy for example-package-policy');
    });
  });

  describe('isOnlyAgentlessIntegration', () => {
    it('should return true if packageInfo is defined and has only agentless integration', () => {
      const packageInfo = {
        policy_templates: [
          {
            name: 'template1',
            title: 'Template 1',
            description: '',
            deployment_modes: {
              default: {
                enabled: false,
              },
              agentless: {
                enabled: true,
              },
            },
          },
          {
            name: 'template2',
            title: 'Template 2',
            description: '',
            deployment_modes: {
              agentless: {
                enabled: true,
              },
            },
          },
        ] as RegistryPolicyTemplate[],
      };

      const result = isOnlyAgentlessIntegration(packageInfo);

      expect(result).toBe(true);
    });

    it('should return true if packageInfo is defined and selected integration only has agentless', () => {
      const packageInfo = {
        policy_templates: [
          {
            name: 'template1',
            title: 'Template 1',
            description: '',
            deployment_modes: {
              default: {
                enabled: true,
              },
              agentless: {
                enabled: true,
              },
            },
          },
          {
            name: 'template2',
            title: 'Template 2',
            description: '',
            deployment_modes: {
              agentless: {
                enabled: true,
              },
            },
          },
        ] as RegistryPolicyTemplate[],
      };

      const result = isOnlyAgentlessIntegration(packageInfo, 'template2');

      expect(result).toBe(true);
    });

    it('should return false if packageInfo is defined but has other deployment types', () => {
      const packageInfo = {
        policy_templates: [
          {
            name: 'template1',
            title: 'Template 1',
            description: '',
            deployment_modes: {
              default: {
                enabled: true,
              },
              agentless: {
                enabled: true,
              },
            },
          },
          {
            name: 'template2',
            title: 'Template 2',
            description: '',
            deployment_modes: {
              default: {
                enabled: true,
              },
            },
          },
        ] as RegistryPolicyTemplate[],
      };

      const result = isOnlyAgentlessIntegration(packageInfo);

      expect(result).toBe(false);
    });

    it('should return false if packageInfo has no policy templates', () => {
      const packageInfo = {
        policy_templates: [],
      };

      const result = isOnlyAgentlessIntegration(packageInfo);

      expect(result).toBe(false);
    });

    it('should return false if packageInfo is undefined', () => {
      const packageInfo = undefined;

      const result = isOnlyAgentlessIntegration(packageInfo);

      expect(result).toBe(false);
    });
  });

  describe('isOnlyAgentlessPolicyTemplate', () => {
    it('should return true if the policy template is only agentless', () => {
      const policyTemplate = {
        name: 'template1',
        title: 'Template 1',
        description: '',
        deployment_modes: {
          default: {
            enabled: false,
          },
          agentless: {
            enabled: true,
          },
        },
      };
      const policyTemplate2 = {
        name: 'template2',
        title: 'Template 2',
        description: '',
        deployment_modes: {
          agentless: {
            enabled: true,
          },
        },
      };

      const result = isOnlyAgentlessPolicyTemplate(policyTemplate);
      const result2 = isOnlyAgentlessPolicyTemplate(policyTemplate2);

      expect(result).toBe(true);
      expect(result2).toBe(true);
    });

    it('should return false if the policy template has other deployment types', () => {
      const policyTemplate = {
        name: 'template1',
        title: 'Template 1',
        description: '',
        deployment_modes: {
          default: {
            enabled: true,
          },
          agentless: {
            enabled: true,
          },
        },
      };
      const policyTemplate2 = {
        name: 'template2',
        title: 'Template 2',
        description: '',
        deployment_modes: {
          default: {
            enabled: true,
          },
          agentless: {
            enabled: false,
          },
        },
      };

      const result = isOnlyAgentlessPolicyTemplate(policyTemplate);
      const result2 = isOnlyAgentlessPolicyTemplate(policyTemplate2);

      expect(result).toBe(false);
      expect(result2).toBe(false);
    });

    it('should return false if the policy template has no deployment modes', () => {
      const policyTemplate = {
        name: 'template1',
        title: 'Template 1',
        description: '',
      };

      const result = isOnlyAgentlessPolicyTemplate(policyTemplate);

      expect(result).toBe(false);
    });
  });

  describe('isInputAllowedForDeploymentMode', () => {
    const packageInfoWithDeploymentModes = {
      name: 'test-package',
      version: '1.0.0',
      owner: { github: 'elastic' },
      policy_templates: [
        {
          name: 'template1',
          title: 'Template 1',
          description: '',
          deployment_modes: {
            agentless: {
              enabled: true,
            },
          },
          inputs: [
            { type: 'logs', deployment_modes: ['default', 'agentless'] },
            { type: 'metrics', deployment_modes: ['default'] },
          ],
        },
        {
          name: 'template2',
          title: 'Template 2',
          description: '',
          deployment_modes: {
            agentless: {
              enabled: true,
            },
          },
          inputs: [
            { type: 'logs', deployment_modes: ['agentless'] },
            { type: 'tcp', deployment_modes: ['default'] },
          ],
        },
      ] as RegistryPolicyTemplate[],
    } as any;

    it('should return true for input with deployment_modes including the requested mode', () => {
      const input = { type: 'logs', policy_template: 'template1' };
      expect(
        isInputAllowedForDeploymentMode(input, 'agentless', packageInfoWithDeploymentModes)
      ).toBe(true);
      expect(
        isInputAllowedForDeploymentMode(input, 'default', packageInfoWithDeploymentModes)
      ).toBe(true);
    });

    it('should return false for input with deployment_modes not including the requested mode', () => {
      const input = { type: 'metrics', policy_template: 'template1' };
      expect(
        isInputAllowedForDeploymentMode(input, 'agentless', packageInfoWithDeploymentModes)
      ).toBe(false);
      expect(
        isInputAllowedForDeploymentMode(input, 'default', packageInfoWithDeploymentModes)
      ).toBe(true);
    });

    it('should return false for input without a policy_template deployment_mode enabled for agentless when the requested mode is agentless', () => {
      const packageInfoWithoutPolicyTemplateDeploymentModes = {
        name: 'test-package',
        version: '1.0.0',
        owner: { github: 'elastic' },
        policy_templates: [
          {
            name: 'template1',
            title: 'Template 1',
            description: '',
            inputs: [{ type: 'metrics', deployment_modes: ['agentless', 'default'] }],
          },
        ] as RegistryPolicyTemplate[],
      } as any;
      const input = { type: 'metrics', policy_template: 'template1' };
      expect(
        isInputAllowedForDeploymentMode(
          input,
          'agentless',
          packageInfoWithoutPolicyTemplateDeploymentModes
        )
      ).toBe(false);
    });

    it('should return false for input with a policy_template deployment mode that overrides the requested mode', () => {
      const packageInfoWithPolicyTemplateOverride = {
        name: 'test-package',
        version: '1.0.0',
        owner: { github: 'elastic' },
        policy_templates: [
          {
            name: 'template1',
            title: 'Template 1',
            description: '',
            deployment_modes: {
              agentless: {
                enabled: false,
              },
              default: {
                enabled: false,
              },
            },
            inputs: [{ type: 'metrics', deployment_modes: ['agentless', 'default'] }],
          },
        ] as RegistryPolicyTemplate[],
      } as any;
      const input = { type: 'metrics', policy_template: 'template1' };
      expect(
        isInputAllowedForDeploymentMode(input, 'agentless', packageInfoWithPolicyTemplateOverride)
      ).toBe(false);

      expect(
        isInputAllowedForDeploymentMode(input, 'default', packageInfoWithPolicyTemplateOverride)
      ).toBe(false);
    });

    it('should return true for input with no policy template or input deployment mode defined when requested mode is default ', () => {
      const packageInfoWithPolicyTemplateOverride = {
        name: 'test-package',
        version: '1.0.0',
        owner: { github: 'elastic' },
        policy_templates: [
          {
            name: 'template1',
            title: 'Template 1',
            description: '',
            inputs: [{ type: 'metrics' }],
          },
        ] as RegistryPolicyTemplate[],
      } as any;
      const input = { type: 'metrics', policy_template: 'template1' };
      expect(
        isInputAllowedForDeploymentMode(input, 'default', packageInfoWithPolicyTemplateOverride)
      ).toBe(true);
    });

    it('should handle inputs with different deployment_modes under different policy templates', () => {
      const input1 = { type: 'logs', policy_template: 'template1' };
      const input2 = { type: 'logs', policy_template: 'template2' };

      expect(
        isInputAllowedForDeploymentMode(input1, 'default', packageInfoWithDeploymentModes)
      ).toBe(true);
      expect(
        isInputAllowedForDeploymentMode(input2, 'default', packageInfoWithDeploymentModes)
      ).toBe(false);
    });

    it('should fall back to blocklist for agentless mode when deployment_modes not specified', () => {
      const packageInfoWithoutDeploymentModes = {
        name: 'test-package',
        version: '1.0.0',
        owner: { github: 'elastic' },
        policy_templates: [
          {
            name: 'template1',
            title: 'Template 1',
            description: '',
            deployment_modes: {
              agentless: {
                enabled: true,
              },
            },
            inputs: [{ type: 'log' }, { type: 'winlog' }],
          },
        ] as RegistryPolicyTemplate[],
      } as any;

      const logInput = { type: 'log', policy_template: 'template1' };
      const winlogInput = { type: 'winlog', policy_template: 'template1' };

      // `winlog` is in AGENTLESS_DISABLED_INPUTS and is therefore not allowed in agentless
      // `log` is not on the blocklist and is allowed in agentless
      expect(
        isInputAllowedForDeploymentMode(winlogInput, 'agentless', packageInfoWithoutDeploymentModes)
      ).toBe(false);
      expect(
        isInputAllowedForDeploymentMode(logInput, 'agentless', packageInfoWithoutDeploymentModes)
      ).toBe(true);
    });

    it('should return true for default mode when deployment_modes not specified', () => {
      const packageInfoWithoutDeploymentModes = {
        name: 'test-package',
        version: '1.0.0',
        owner: { github: 'elastic' },
        policy_templates: [
          {
            name: 'template1',
            title: 'Template 1',
            description: '',
            inputs: [{ type: 'logfile' }],
          },
        ] as RegistryPolicyTemplate[],
      } as any;

      const input = { type: 'logfile', policy_template: 'template1' };
      expect(
        isInputAllowedForDeploymentMode(input, 'default', packageInfoWithoutDeploymentModes)
      ).toBe(true);
    });

    it('should always allow system package inputs regardless of blocklist or deployment_modes', () => {
      const systemPackageInfo = {
        name: 'system',
        version: '1.0.0',
        owner: { github: 'elastic' },
        policy_templates: [
          {
            name: 'system',
            title: 'System',
            description: '',
            inputs: [
              { type: 'filelog' }, // This would normally be blocked by agentless blocklist
              { type: 'system/metrics' },
            ],
          },
        ] as RegistryPolicyTemplate[],
      } as any;

      const winlogInput = { type: 'winlog', policy_template: 'system' };
      const metricsInput = { type: 'system/metrics', policy_template: 'system' };

      // System package should always be allowed for any deployment mode
      expect(isInputAllowedForDeploymentMode(winlogInput, 'agentless', systemPackageInfo)).toBe(
        true
      );
      expect(isInputAllowedForDeploymentMode(winlogInput, 'default', systemPackageInfo)).toBe(true);
      expect(isInputAllowedForDeploymentMode(metricsInput, 'agentless', systemPackageInfo)).toBe(
        true
      );
      expect(isInputAllowedForDeploymentMode(metricsInput, 'default', systemPackageInfo)).toBe(
        true
      );
    });

    it('should allow system package inputs even when they specify deployment_modes that would exclude the mode', () => {
      const systemPackageInfoWithDeploymentModes = {
        name: 'system',
        version: '1.0.0',
        owner: { github: 'elastic' },
        policy_templates: [
          {
            name: 'system',
            title: 'System',
            description: '',
            inputs: [
              { type: 'system/metrics', deployment_modes: ['default'] }, // Only allows default
            ],
          },
        ] as RegistryPolicyTemplate[],
      } as any;

      const input = { type: 'system/metrics', policy_template: 'system' };

      // System package should override deployment_modes restrictions
      expect(
        isInputAllowedForDeploymentMode(input, 'agentless', systemPackageInfoWithDeploymentModes)
      ).toBe(true);
      expect(
        isInputAllowedForDeploymentMode(input, 'default', systemPackageInfoWithDeploymentModes)
      ).toBe(true);
    });
  });

  describe('validateDeploymentModesForInputs', () => {
    const packageInfo = {
      name: 'test-package',
      version: '1.0.0',
      owner: { github: 'elastic' },
      policy_templates: [
        {
          name: 'template1',
          title: 'Template 1',
          description: '',
          deployment_modes: {
            agentless: {
              enabled: true,
            },
          },
          inputs: [
            { type: 'logs', deployment_modes: ['default', 'agentless'] },
            { type: 'metrics', deployment_modes: ['default'] },
          ],
        },
      ] as RegistryPolicyTemplate[],
    } as any;

    it('should not throw for valid inputs', () => {
      const inputs = [
        { type: 'logs', enabled: true, policy_template: 'template1' },
        { type: 'metrics', enabled: false, policy_template: 'template1' },
      ];

      expect(() =>
        validateDeploymentModesForInputs(inputs, 'agentless', packageInfo)
      ).not.toThrow();
    });

    it('should throw for invalid enabled inputs', () => {
      const inputs = [{ type: 'metrics', enabled: true, policy_template: 'template1' }];

      expect(() => validateDeploymentModesForInputs(inputs, 'agentless', packageInfo)).toThrow(
        "Input metrics in test-package is not allowed for deployment mode 'agentless'"
      );
    });

    it('should not throw for disabled inputs even if they are not allowed', () => {
      const inputs = [{ type: 'metrics', enabled: false, policy_template: 'template1' }];

      expect(() =>
        validateDeploymentModesForInputs(inputs, 'agentless', packageInfo)
      ).not.toThrow();
    });
  });
});
