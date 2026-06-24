/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { substituteWorkflowConnectorIds } from './step_install_workflow_assets';

describe('substituteWorkflowConnectorIds', () => {
  const sampleYaml = `
consts:
  orgLogin: REPLACE_WITH_ORG_LOGIN
  githubConnectorId: REPLACE_WITH_GITHUB_CONNECTOR_ID
  slackConnectorId: REPLACE_WITH_SLACK_CONNECTOR_ID
  salesforceConnectorId: REPLACE_WITH_SALESFORCE_CONNECTOR_ID
  caseGithubField: REPLACE_WITH_SALESFORCE_CASE_GITHUB_FIELD
  productAreaField: REPLACE_WITH_SALESFORCE_PRODUCT_AREA_FIELD
  sdhRepoPattern: REPLACE_WITH_SDH_REPO_PATTERN
  sdhLabel: REPLACE_WITH_SDH_LABEL
`;

  it('substitutes connector and org placeholders from package policy vars', () => {
    const result = substituteWorkflowConnectorIds(sampleYaml, {
      github_connector_id: 'github-conn-1',
      slack_connector_id: 'slack-conn-2',
      salesforce_connector_id: 'salesforce-conn-3',
      salesforce_case_github_field: 'Engineering_Issue_URL__c',
      salesforce_product_area_field: 'Product_Area__c',
      sdh_repo_pattern: 'sdh-*',
      sdh_label: 'sdh',
      org_login: 'my-org',
    });

    expect(result).toContain('orgLogin: my-org');
    expect(result).toContain('githubConnectorId: github-conn-1');
    expect(result).toContain('slackConnectorId: slack-conn-2');
    expect(result).toContain('salesforceConnectorId: salesforce-conn-3');
    expect(result).toContain('caseGithubField: Engineering_Issue_URL__c');
    expect(result).toContain('productAreaField: Product_Area__c');
    expect(result).toContain('sdhRepoPattern: sdh-*');
    expect(result).toContain('sdhLabel: sdh');
    expect(result).not.toContain('REPLACE_WITH_ORG_LOGIN');
    expect(result).not.toContain('REPLACE_WITH_GITHUB_CONNECTOR_ID');
    expect(result).not.toContain('REPLACE_WITH_SLACK_CONNECTOR_ID');
    expect(result).not.toContain('REPLACE_WITH_SALESFORCE_CONNECTOR_ID');
    expect(result).not.toContain('REPLACE_WITH_SALESFORCE_CASE_GITHUB_FIELD');
    expect(result).not.toContain('REPLACE_WITH_SALESFORCE_PRODUCT_AREA_FIELD');
    expect(result).not.toContain('REPLACE_WITH_SDH_REPO_PATTERN');
    expect(result).not.toContain('REPLACE_WITH_SDH_LABEL');
  });

  it('leaves placeholders when vars are missing', () => {
    const result = substituteWorkflowConnectorIds(sampleYaml, {});

    expect(result).toContain('REPLACE_WITH_ORG_LOGIN');
    expect(result).toContain('REPLACE_WITH_GITHUB_CONNECTOR_ID');
    expect(result).toContain('REPLACE_WITH_SLACK_CONNECTOR_ID');
    expect(result).toContain('REPLACE_WITH_SALESFORCE_CONNECTOR_ID');
    expect(result).toContain('REPLACE_WITH_SALESFORCE_CASE_GITHUB_FIELD');
    expect(result).toContain('REPLACE_WITH_SALESFORCE_PRODUCT_AREA_FIELD');
    expect(result).toContain('REPLACE_WITH_SDH_REPO_PATTERN');
    expect(result).toContain('REPLACE_WITH_SDH_LABEL');
  });
});
