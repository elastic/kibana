/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidId } from '@kbn/human-readable-id';
import { loggingSystemMock } from '@kbn/core/server/mocks';

import {
  getFleetPackageWorkflowId,
  resolveWorkflowEnabledIntent,
  applyWorkflowEnablement,
  substituteWorkflowConnectorIds,
} from './step_install_workflow_assets';

const mockLogger = {
  warn: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  trace: jest.fn(),
  fatal: jest.fn(),
  log: jest.fn(),
  isLevelEnabled: jest.fn(),
  get: jest.fn(),
};

describe('getFleetPackageWorkflowId', () => {
  it('normalizes package names with underscores for workflow id validation', () => {
    const workflowId = getFleetPackageWorkflowId({
      pkgName: 'sdlc_intel',
      spaceId: 'default',
      fileName: 'github-catalog-repos.yaml',
    });

    expect(workflowId).toBe('fleet-default-sdlc-intel-github-catalog-repos');
    expect(isValidId(workflowId)).toBe(true);
  });

  it('normalizes space ids with underscores for workflow id validation', () => {
    const workflowId = getFleetPackageWorkflowId({
      pkgName: 'sdlc_intel',
      spaceId: 'custom_space',
      fileName: 'github-catalog-repos.yaml',
    });

    expect(workflowId).toBe('fleet-custom-space-sdlc-intel-github-catalog-repos');
    expect(isValidId(workflowId)).toBe(true);
  });
});

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
  gdriveConnectorId: REPLACE_WITH_GOOGLE_DRIVE_CONNECTOR_ID
  roadmapFolderIds: REPLACE_WITH_GDRIVE_ROADMAP_FOLDER_IDS
  aiConnectorId: REPLACE_WITH_AI_CONNECTOR_ID
`;

  beforeEach(() => {
    mockLogger.warn.mockClear();
  });

  it('substitutes connector and org placeholders from package policy vars', () => {
    const result = substituteWorkflowConnectorIds(sampleYaml, {
      github_connector_id: 'github-conn-1',
      slack_connector_id: 'slack-conn-2',
      salesforce_connector_id: 'salesforce-conn-3',
      salesforce_case_github_field: 'Engineering_Issue_URL__c',
      salesforce_product_area_field: 'Product_Area__c',
      sdh_repo_pattern: 'sdh-*',
      sdh_label: 'sdh',
      google_drive_connector_id: 'gdrive-conn-4',
      gdrive_roadmap_folder_ids: ['folder-roadmap-1', 'folder-okrs-2'],
      ai_connector_id: 'ai-conn-5',
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
    expect(result).toContain('gdriveConnectorId: gdrive-conn-4');
    expect(result).toContain('roadmapFolderIds: folder-roadmap-1,folder-okrs-2');
    expect(result).toContain('aiConnectorId: ai-conn-5');
    expect(result).not.toContain('REPLACE_WITH_ORG_LOGIN');
    expect(result).not.toContain('REPLACE_WITH_GITHUB_CONNECTOR_ID');
    expect(result).not.toContain('REPLACE_WITH_SLACK_CONNECTOR_ID');
    expect(result).not.toContain('REPLACE_WITH_SALESFORCE_CONNECTOR_ID');
    expect(result).not.toContain('REPLACE_WITH_SALESFORCE_CASE_GITHUB_FIELD');
    expect(result).not.toContain('REPLACE_WITH_SALESFORCE_PRODUCT_AREA_FIELD');
    expect(result).not.toContain('REPLACE_WITH_SDH_REPO_PATTERN');
    expect(result).not.toContain('REPLACE_WITH_SDH_LABEL');
    expect(result).not.toContain('REPLACE_WITH_GOOGLE_DRIVE_CONNECTOR_ID');
    expect(result).not.toContain('REPLACE_WITH_GDRIVE_ROADMAP_FOLDER_IDS');
    expect(result).not.toContain('REPLACE_WITH_AI_CONNECTOR_ID');
  });

  it('substitutes all placeholders byte-identically for the SDLC package', () => {
    const yaml = `
consts:
  orgLogin: REPLACE_WITH_ORG_LOGIN
  githubConnectorId: REPLACE_WITH_GITHUB_CONNECTOR_ID
  slackConnectorId: REPLACE_WITH_SLACK_CONNECTOR_ID
  salesforceConnectorId: REPLACE_WITH_SALESFORCE_CONNECTOR_ID
  caseGithubField: REPLACE_WITH_SALESFORCE_CASE_GITHUB_FIELD
  productAreaField: REPLACE_WITH_SALESFORCE_PRODUCT_AREA_FIELD
  sdhRepoPattern: REPLACE_WITH_SDH_REPO_PATTERN
  sdhLabel: REPLACE_WITH_SDH_LABEL
  gdriveConnectorId: REPLACE_WITH_GOOGLE_DRIVE_CONNECTOR_ID
  roadmapFolderIds: REPLACE_WITH_GDRIVE_ROADMAP_FOLDER_IDS
  aiConnectorId: REPLACE_WITH_AI_CONNECTOR_ID
`;
    const result = substituteWorkflowConnectorIds(yaml, {
      github_connector_id: 'github-conn-1',
      slack_connector_id: 'slack-conn-2',
      salesforce_connector_id: 'salesforce-conn-3',
      salesforce_case_github_field: 'Engineering_Issue_URL__c',
      salesforce_product_area_field: 'Product_Area__c',
      sdh_repo_pattern: 'sdh-*',
      sdh_label: 'sdh',
      google_drive_connector_id: 'gdrive-conn-4',
      gdrive_roadmap_folder_ids: ['folder-roadmap-1', 'folder-okrs-2'],
      ai_connector_id: 'ai-conn-5',
      org_login: 'my-org',
    });

    expect(result).toBe(`
consts:
  orgLogin: my-org
  githubConnectorId: github-conn-1
  slackConnectorId: slack-conn-2
  salesforceConnectorId: salesforce-conn-3
  caseGithubField: Engineering_Issue_URL__c
  productAreaField: Product_Area__c
  sdhRepoPattern: sdh-*
  sdhLabel: sdh
  gdriveConnectorId: gdrive-conn-4
  roadmapFolderIds: folder-roadmap-1,folder-okrs-2
  aiConnectorId: ai-conn-5
`);
  });

  it('substitutes a new var using only the convention', () => {
    const result = substituteWorkflowConnectorIds(
      'jiraConnectorId: REPLACE_WITH_JIRA_CONNECTOR_ID',
      {
        jira_connector_id: 'jira-conn-1',
      }
    );
    expect(result).toBe('jiraConnectorId: jira-conn-1');
  });

  it('joins multi-value roadmap folder IDs for workflow substitution', () => {
    const result = substituteWorkflowConnectorIds(
      'roadmapFolderIds: REPLACE_WITH_GDRIVE_ROADMAP_FOLDER_IDS',
      {
        gdrive_roadmap_folder_ids: 'folder-a, folder-b',
      }
    );

    expect(result).toContain('roadmapFolderIds: folder-a, folder-b');
  });

  it('trims leading and trailing whitespace from string vars', () => {
    const result = substituteWorkflowConnectorIds('orgLogin: REPLACE_WITH_ORG_LOGIN', {
      org_login: '  my-org  ',
    });
    expect(result).toBe('orgLogin: my-org');
  });

  it('trims whitespace around array elements and joins with commas', () => {
    const result = substituteWorkflowConnectorIds(
      'roadmapFolderIds: REPLACE_WITH_GDRIVE_ROADMAP_FOLDER_IDS',
      {
        gdrive_roadmap_folder_ids: ['  folder-a  ', 'folder-b'],
      }
    );
    expect(result).toBe('roadmapFolderIds: folder-a,folder-b');
  });

  it('drops empty or whitespace-only array elements', () => {
    const result = substituteWorkflowConnectorIds(
      'roadmapFolderIds: REPLACE_WITH_GDRIVE_ROADMAP_FOLDER_IDS',
      {
        gdrive_roadmap_folder_ids: ['folder-a', '', '   ', 'folder-b'],
      }
    );
    expect(result).toBe('roadmapFolderIds: folder-a,folder-b');
  });

  it('leaves placeholder untouched when string var is whitespace-only', () => {
    const result = substituteWorkflowConnectorIds('orgLogin: REPLACE_WITH_ORG_LOGIN', {
      org_login: '   ',
    });
    expect(result).toBe('orgLogin: REPLACE_WITH_ORG_LOGIN');
  });

  it('substitutes the longest matching placeholder even when a shorter one is a prefix', () => {
    const result = substituteWorkflowConnectorIds('orgLogin: REPLACE_WITH_ORG_LOGIN', {
      org: 'SHORT',
      org_login: 'my-org',
    });
    expect(result).toBe('orgLogin: my-org');
  });

  it('is independent of vars insertion order for prefix placeholders', () => {
    const result = substituteWorkflowConnectorIds('orgLogin: REPLACE_WITH_ORG_LOGIN', {
      org_login: 'my-org',
      org: 'SHORT',
    });
    expect(result).toBe('orgLogin: my-org');
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
    expect(result).toContain('REPLACE_WITH_GOOGLE_DRIVE_CONNECTOR_ID');
    expect(result).toContain('REPLACE_WITH_GDRIVE_ROADMAP_FOLDER_IDS');
    expect(result).toContain('REPLACE_WITH_AI_CONNECTOR_ID');
  });

  it('warns when a placeholder has no matching var', () => {
    substituteWorkflowConnectorIds('orgLogin: REPLACE_WITH_ORG_LOGIN', {}, mockLogger);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Workflow placeholder REPLACE_WITH_ORG_LOGIN has no matching package policy var'
    );
  });

  it('does not warn when all placeholders are resolved', () => {
    substituteWorkflowConnectorIds(
      'orgLogin: REPLACE_WITH_ORG_LOGIN',
      { org_login: 'my-org' },
      mockLogger
    );

    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('warns only once per unique unresolved placeholder', () => {
    substituteWorkflowConnectorIds(
      'a: REPLACE_WITH_ORG_LOGIN\nb: REPLACE_WITH_ORG_LOGIN',
      {},
      mockLogger
    );

    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Workflow placeholder REPLACE_WITH_ORG_LOGIN has no matching package policy var'
    );
  });

  it('does not warn about placeholders that are not Fleet vars', () => {
    const result = substituteWorkflowConnectorIds(
      'custom: REPLACE_WITH_CUSTOM_PLACEHOLDER',
      {},
      mockLogger
    );

    expect(result).toContain('REPLACE_WITH_CUSTOM_PLACEHOLDER');
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Workflow placeholder REPLACE_WITH_CUSTOM_PLACEHOLDER has no matching package policy var'
    );
  });

  it('substitutes a second, non-SDLC fixture package using only the convention', () => {
    const fixtureYaml = `
config:
  jiraConnectorId: REPLACE_WITH_JIRA_CONNECTOR_ID
  confluenceConnectorId: REPLACE_WITH_CONFLUENCE_CONNECTOR_ID
  projectKeys: REPLACE_WITH_JIRA_PROJECT_KEYS
`;

    const result = substituteWorkflowConnectorIds(fixtureYaml, {
      jira_connector_id: 'jira-conn-1',
      confluence_connector_id: 'confluence-conn-2',
      jira_project_keys: ['PROJ', 'TEAM'],
    });

    expect(result).toBe(`
config:
  jiraConnectorId: jira-conn-1
  confluenceConnectorId: confluence-conn-2
  projectKeys: PROJ,TEAM
`);
  });

  it('fails the non-SDLC fixture test if the convention logic is removed', () => {
    // This is a deliberate break guard: if substitution stops using the convention,
    // the second fixture package stops substituting and the test fails.
    const fixtureYaml = `
config:
  jiraConnectorId: REPLACE_WITH_JIRA_CONNECTOR_ID
`;

    const result = substituteWorkflowConnectorIds(fixtureYaml, {
      jira_connector_id: 'jira-conn-1',
    });

    expect(result).not.toContain('REPLACE_WITH_JIRA_CONNECTOR_ID');
    expect(result).toContain('jiraConnectorId: jira-conn-1');
  });
});

describe('resolveWorkflowEnabledIntent', () => {
  it('returns true when default_enabled is true', () => {
    expect(resolveWorkflowEnabledIntent(true, 'any.yaml')).toBe(true);
  });

  it('returns false when default_enabled is false', () => {
    expect(resolveWorkflowEnabledIntent(false, 'any.yaml')).toBe(false);
  });

  it('returns undefined when default_enabled is absent', () => {
    expect(resolveWorkflowEnabledIntent(undefined, 'any.yaml')).toBeUndefined();
  });

  it('returns true for files listed in the array and false otherwise', () => {
    expect(resolveWorkflowEnabledIntent(['enabled.yaml'], 'enabled.yaml')).toBe(true);
    expect(resolveWorkflowEnabledIntent(['enabled.yaml'], 'disabled.yaml')).toBe(false);
  });
});

describe('applyWorkflowEnablement', () => {
  const applyMockLogger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('enables all workflows when default_enabled is true and placeholders are resolved', () => {
    const yaml = `enabled: false\nname: wf\nsteps: []`;
    const { yaml: result } = applyWorkflowEnablement(yaml, true, [], applyMockLogger);
    expect(result).toContain('enabled: true');
    expect(applyMockLogger.warn).not.toHaveBeenCalled();
  });

  it('disables all workflows when default_enabled is false', () => {
    const yaml = `enabled: true\nname: wf\nsteps: []`;
    const { yaml: result } = applyWorkflowEnablement(yaml, false, [], applyMockLogger);
    expect(result).toContain('enabled: false');
  });

  it('leaves enabled unchanged when intent is undefined', () => {
    const yaml = `enabled: true\nname: wf\nsteps: []`;
    const { yaml: result } = applyWorkflowEnablement(yaml, undefined, [], applyMockLogger);
    expect(result).toContain('enabled: true');
  });

  it('forces disabled and warns when placeholders are unresolved', () => {
    const yaml = `enabled: true\nname: wf\nsteps: []`;
    const unresolved = ['REPLACE_WITH_FOO'];
    const { yaml: result } = applyWorkflowEnablement(yaml, true, unresolved, applyMockLogger);
    expect(result).toContain('enabled: false');
    expect(applyMockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('REPLACE_WITH_FOO'));
  });

  it('preserves step-level enabled keys while editing top-level enabled', () => {
    const yaml = `enabled: true\nname: wf\nsteps:\n  - type: wait\n    enabled: true`;
    const { yaml: result } = applyWorkflowEnablement(yaml, false, [], applyMockLogger);
    expect(result).toContain('enabled: false');
    const stepEnabledMatches = result.match(/enabled: true/g);
    expect(stepEnabledMatches).toHaveLength(1);
  });
});
