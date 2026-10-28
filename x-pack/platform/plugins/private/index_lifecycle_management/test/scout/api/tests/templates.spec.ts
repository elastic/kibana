/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { ApiClientFixture, EsClient, RoleApiCredentials } from '@kbn/scout';

import { API_BASE_PATH, ILM_API_ROLE, getHeaders, getResourceName } from '../fixtures/constants';
import { deletePolicy, getPolicyPayload, putPolicy } from '../fixtures/policies';

interface TemplateListItem {
  name: string;
  settings?: { index?: { lifecycle?: { name?: string; rollover_alias?: string } } };
}

apiTest.describe('Index Lifecycle Management - templates', { tag: tags.stateful.classic }, () => {
  let credentials: RoleApiCredentials;
  const createdTemplates = new Set<string>();
  const createdPolicies = new Set<string>();

  const createLegacyTemplate = async (
    esClient: EsClient,
    name: string,
    indexPatterns = [`${name}-*`]
  ) => {
    createdTemplates.add(name);
    await esClient.indices.putTemplate({
      name,
      create: true,
      index_patterns: indexPatterns,
      settings: { number_of_shards: 1 },
    });
  };

  const loadLegacyTemplates = async (apiClient: ApiClientFixture) => {
    const response = await apiClient.get<TemplateListItem[]>(
      `${API_BASE_PATH}/templates?legacy=true`,
      {
        headers: getHeaders(credentials),
        responseType: 'json',
      }
    );
    expect(response).toHaveStatusCode(200);
    return response.body;
  };

  apiTest.beforeAll(async ({ requestAuth }) => {
    credentials = await requestAuth.getApiKeyForCustomRole(ILM_API_ROLE);
  });

  apiTest.afterEach(async ({ esClient }) => {
    await Promise.all(
      [...createdTemplates].map((name) =>
        esClient.indices.deleteTemplate({ name }, { ignore: [404] })
      )
    );
    await Promise.all([...createdPolicies].map((name) => deletePolicy(esClient, name)));
    createdTemplates.clear();
    createdPolicies.clear();
  });

  apiTest('lists legacy templates', async ({ apiClient, esClient }) => {
    const templateName = getResourceName('template');
    await createLegacyTemplate(esClient, templateName);

    const templates = await loadLegacyTemplates(apiClient);

    expect(templates.map(({ name }) => name)).toContain(templateName);
  });

  apiTest(
    'filters out system templates whose index patterns have no wildcard',
    async ({ apiClient, esClient }) => {
      // System templates start with a "."
      const templateName = `.${getResourceName('system-template')}`;
      await createLegacyTemplate(esClient, templateName, [`${templateName.slice(1)}-no-wildcard`]);
      // Guard against a vacuous pass: the template really exists in ES.
      expect(Object.keys(await esClient.indices.getTemplate({ name: templateName }))).toContain(
        templateName
      );

      const templates = await loadLegacyTemplates(apiClient);

      expect(templates.map(({ name }) => name)).not.toContain(templateName);
    }
  );

  apiTest('adds a policy to a legacy template', async ({ apiClient, esClient }) => {
    const policy = getPolicyPayload(getResourceName('template-policy'));
    createdPolicies.add(policy.name);
    await putPolicy(esClient, policy);

    const templateName = getResourceName('template');
    await createLegacyTemplate(esClient, templateName);
    const rolloverAlias = getResourceName('alias');

    const response = await apiClient.post(`${API_BASE_PATH}/template?legacy=true`, {
      headers: getHeaders(credentials),
      responseType: 'json',
      body: { templateName, policyName: policy.name, aliasName: rolloverAlias },
    });

    expect(response).toHaveStatusCode(200);

    const templates = await loadLegacyTemplates(apiClient);
    const fetchedTemplate = templates.find(({ name }) => name === templateName);
    expect(fetchedTemplate?.settings?.index?.lifecycle).toStrictEqual({
      name: policy.name,
      rollover_alias: rolloverAlias,
    });

    const templateFromEs = await esClient.indices.getTemplate({ name: templateName });
    expect(templateFromEs[templateName].settings?.index?.lifecycle).toStrictEqual({
      name: policy.name,
      rollover_alias: rolloverAlias,
    });
  });
});
