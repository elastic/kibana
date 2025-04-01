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
});
