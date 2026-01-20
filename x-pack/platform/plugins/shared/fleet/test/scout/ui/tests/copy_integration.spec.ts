/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';

import { test } from '../fixtures';

test.describe('Copy integration', { tag: ['@ess'] }, () => {
  const testAgentPolicyName = 'Test Agent Policy for Copy';
  const packagePolicyName = 'nginx-test-copy';
  let agentPolicyId: string;
  let packagePolicyId: string;

  test.beforeAll(async ({ kbnClient }) => {
    const agentPolicyResponse = await kbnClient.request<{ item: { id: string } }>({
      method: 'POST',
      path: '/api/fleet/agent_policies',
      body: {
        name: testAgentPolicyName,
        namespace: 'default',
        monitoring_enabled: ['logs', 'metrics'],
      },
    });
    agentPolicyId = agentPolicyResponse.data.item.id;

    const packagePolicyResponse = await kbnClient.request<{ item: { id: string } }>({
      method: 'POST',
      path: '/api/fleet/package_policies',
      query: {
        format: 'simplified',
      },
      body: {
        policy_ids: [agentPolicyId],
        package: {
          name: 'nginx',
          version: '2.3.2',
        },
        name: packagePolicyName,
        description: '',
        namespace: 'default',
        inputs: {
          'nginx-logfile': {
            enabled: true,
            streams: {
              'nginx.access': {
                enabled: true,
                vars: {
                  paths: ['/var/log/nginx/test123-access.log*'],
                  tags: ['nginx-access'],
                  preserve_original_event: false,
                  ignore_older: '72h',
                },
              },
              'nginx.error': {
                enabled: false,
                vars: {
                  paths: ['/var/log/nginx/error.log*'],
                  tags: ['nginx-error'],
                  preserve_original_event: false,
                  ignore_older: '72h',
                },
              },
            },
          },
          'nginx-nginx/metrics': {
            enabled: false,
            vars: {
              hosts: ['http://127.0.0.1:80'],
            },
            streams: {
              'nginx.stubstatus': {
                enabled: false,
                vars: {
                  period: '10s',
                  server_status_path: '/nginx_status',
                  tags: ['nginx-stubstatus'],
                },
              },
            },
          },
        },
      },
    });
    packagePolicyId = packagePolicyResponse.data.item.id;
  });

  test.afterAll(async ({ kbnClient }) => {
    if (packagePolicyId) {
      await kbnClient.request({
        method: 'POST',
        path: '/api/fleet/package_policies/delete',
        body: {
          packagePolicyIds: [packagePolicyId],
        },
      });
    }

    const packagePoliciesResponse = await kbnClient.request<{
      items: Array<{ id: string; name: string }>;
    }>({
      method: 'GET',
      path: '/api/fleet/package_policies',
      query: {
        kuery: `ingest-package-policies.name:${packagePolicyName}*`,
      },
    });
    for (const policy of packagePoliciesResponse.data.items) {
      if (policy.name.startsWith(packagePolicyName)) {
        await kbnClient.request({
          method: 'POST',
          path: '/api/fleet/package_policies/delete',
          body: {
            packagePolicyIds: [policy.id],
          },
        });
      }
    }

    if (agentPolicyId) {
      await kbnClient.request({
        method: 'POST',
        path: '/api/fleet/agent_policies/delete',
        body: {
          agentPolicyId,
        },
      });
    }
  });

  test('can copy nginx package policy', async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    const { copyIntegration } = pageObjects;

    await copyIntegration.navigateTo(agentPolicyId, packagePolicyId);
    await copyIntegration.waitForPageToLoad();

    const nameInput = copyIntegration.getPackagePolicyNameInput();
    await expect(nameInput).toBeVisible();

    await expect(nameInput).toHaveValue(`copy-${packagePolicyName}`);

    const pathsInput = copyIntegration.getMultiTextInputRow('nginx.access', 'paths');
    await expect(pathsInput).toHaveValue('/var/log/nginx/test123-access.log*');

    await expect(copyIntegration.getSaveButton()).toBeVisible();
    await copyIntegration.clickSaveButton();

    await expect(copyIntegration.getSuccessPostInstallAddAgentModal()).toBeVisible();
  });
});
