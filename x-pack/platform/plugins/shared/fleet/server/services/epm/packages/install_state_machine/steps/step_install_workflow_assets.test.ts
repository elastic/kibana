/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidId } from '@kbn/human-readable-id';
import { loggingSystemMock, savedObjectsClientMock, httpServerMock } from '@kbn/core/server/mocks';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

import { appContextService } from '../../../../app_context';
import { createArchiveIteratorFromMap } from '../../../archive/archive_iterator';
import {
  createAppContextStartContractMock,
  createWorkflowsManagementSetupMock,
} from '../../../../../mocks';
import { saveKibanaAssetsRefs } from '../../install';

import {
  stepInstallWorkflowAssets,
  getFleetPackageWorkflowId,
  orderWorkflowEntriesByDependencies,
  resolveWorkflowEnabledIntent,
  substituteWorkflowConnectorIds,
} from './step_install_workflow_assets';

jest.mock('../../install');

type StepInstallWorkflowAssetsParam = Parameters<typeof stepInstallWorkflowAssets>[number];

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

describe('orderWorkflowEntriesByDependencies', () => {
  const entry = (fileName: string) => ({ fileName, yaml: `name: ${fileName}` });

  it('installs transitive dependencies before their dependents', () => {
    const ordered = orderWorkflowEntriesByDependencies(
      [entry('enrich.yaml'), entry('catalog.yaml'), entry('cross-link.yaml')],
      {
        'enrich.yaml': ['cross-link'],
        'cross-link.yaml': ['catalog.yaml'],
      }
    );

    expect(ordered.map(({ fileName }) => fileName)).toEqual([
      'catalog.yaml',
      'cross-link.yaml',
      'enrich.yaml',
    ]);
  });

  it('preserves archive order for independent workflows', () => {
    const ordered = orderWorkflowEntriesByDependencies([entry('b.yaml'), entry('a.yaml')]);

    expect(ordered.map(({ fileName }) => fileName)).toEqual(['b.yaml', 'a.yaml']);
  });

  it('rejects a dependency on a missing workflow', () => {
    expect(() =>
      orderWorkflowEntriesByDependencies([entry('enrich.yaml')], {
        'enrich.yaml': ['missing.yaml'],
      })
    ).toThrow('missing asset "missing.yaml"');
  });

  it('rejects dependency cycles with the cycle chain', () => {
    expect(() =>
      orderWorkflowEntriesByDependencies([entry('a.yaml'), entry('b.yaml')], {
        'a.yaml': ['b.yaml'],
        'b.yaml': ['a.yaml'],
      })
    ).toThrow('a.yaml -> b.yaml -> a.yaml');
  });

  it('rejects dependency declarations for missing owners', () => {
    expect(() =>
      orderWorkflowEntriesByDependencies([entry('catalog.yaml')], {
        'enrich.yaml': ['catalog.yaml'],
      })
    ).toThrow('dependencies declared for missing asset "enrich.yaml"');
  });
});

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

  it('does not resolve runtime Liquid policy.vars (install-time is the supported path)', () => {
    const yaml = [
      'consts:',
      '  githubConnectorId: "{{ policy.vars.github_connector_id }}"',
      '  githubConnectorIdStatic: REPLACE_WITH_GITHUB_CONNECTOR_ID',
    ].join('\n');

    const result = substituteWorkflowConnectorIds(yaml, {
      github_connector_id: 'github-conn-1',
    });

    expect(result).toContain('githubConnectorId: "{{ policy.vars.github_connector_id }}"');
    expect(result).toContain('githubConnectorIdStatic: github-conn-1');
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

describe('stepInstallWorkflowAssets', () => {
  const pkgName = 'test-package';
  const pkgVersion = '1.2.3';
  const spaceId = DEFAULT_SPACE_ID;
  const workflowFileName = 'my-workflow.yaml';
  const workflowId = 'fleet-default-test-package-my-workflow';
  const workflowYaml = `name: my-workflow\nenabled: true\nsteps: []`;

  let workflowsManagementSetupMock: ReturnType<typeof createWorkflowsManagementSetupMock>;
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;

  beforeEach(() => {
    savedObjectsClient = savedObjectsClientMock.create();
    workflowsManagementSetupMock = createWorkflowsManagementSetupMock();
    appContextService.start(createAppContextStartContractMock());
    appContextService.setWorkflowsManagementSetup(workflowsManagementSetupMock);
    jest.mocked(saveKibanaAssetsRefs).mockReset();
  });

  afterEach(() => {
    appContextService.stop();
  });

  const createContext = (
    overrides: Record<string, unknown> = {}
  ): StepInstallWorkflowAssetsParam => ({
    logger: loggingSystemMock.createLogger(),
    savedObjectsClient,
    spaceId,
    request: httpServerMock.createKibanaRequest(),
    packageInstallContext: {
      packageInfo: {
        name: pkgName,
        version: pkgVersion,
        title: pkgName,
        owner: { github: 'elastic/fleet' },
        format_version: '1.0.0',
        description: 'test package',
      },
      paths: [`${pkgName}-${pkgVersion}/kibana/workflow/${workflowFileName}`],
      archiveIterator: createArchiveIteratorFromMap(
        new Map([
          [
            `${pkgName}-${pkgVersion}/kibana/workflow/${workflowFileName}`,
            Buffer.from(workflowYaml),
          ],
        ])
      ),
    },
    ...overrides,
  });

  it('installs dependency workflows before dependents even when archive order is reversed', async () => {
    const upstreamFile = 'catalog.yaml';
    const downstreamFile = 'enrich.yaml';
    const context = createContext({
      packageInstallContext: {
        packageInfo: {
          name: pkgName,
          version: pkgVersion,
          workflows: {
            default_enabled: true,
            dependencies: { [downstreamFile]: [upstreamFile] },
          },
        },
        archiveIterator: createArchiveIteratorFromMap(
          new Map([
            [
              `${pkgName}-${pkgVersion}/kibana/workflow/${downstreamFile}`,
              Buffer.from('name: enrich\nenabled: false\nsteps: []'),
            ],
            [
              `${pkgName}-${pkgVersion}/kibana/workflow/${upstreamFile}`,
              Buffer.from('name: catalog\nenabled: false\nsteps: []'),
            ],
          ])
        ),
      },
    });

    await stepInstallWorkflowAssets(context);

    expect(workflowsManagementSetupMock.management.createWorkflow).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: 'fleet-default-test-package-catalog' }),
      spaceId,
      expect.anything()
    );
    expect(workflowsManagementSetupMock.management.createWorkflow).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: 'fleet-default-test-package-enrich' }),
      spaceId,
      expect.anything()
    );
  });

  it('creates workflow assets when request context is missing', async () => {
    const logger = loggingSystemMock.createLogger();
    const context = createContext({
      logger,
      request: undefined,
    });

    await stepInstallWorkflowAssets(context);

    expect(logger.debug).toHaveBeenCalledWith(
      `Installing workflow assets for ${pkgName} using Fleet internal request (no install request context)`
    );
    expect(workflowsManagementSetupMock.management.createWorkflow).toHaveBeenCalledWith(
      { id: workflowId, yaml: expect.any(String) },
      spaceId,
      expect.objectContaining({ isFakeRequest: true, isSystemRequest: true })
    );
  });

  it('creates a workflow and stamps managed ownership fields', async () => {
    await stepInstallWorkflowAssets(createContext());

    expect(workflowsManagementSetupMock.management.createWorkflow).toHaveBeenCalledWith(
      { id: workflowId, yaml: expect.any(String) },
      spaceId,
      expect.anything()
    );

    expect(workflowsManagementSetupMock.management.updateWorkflow).toHaveBeenCalledWith(
      workflowId,
      expect.objectContaining({
        yaml: expect.any(String),
        managed: true,
        managedBy: pkgName,
        managedVersion: null,
      }),
      spaceId,
      expect.anything(),
      { allowManagedWorkflowMutation: true }
    );
  });

  it('reinstalls a managed workflow without throwing ManagedWorkflowUpdateForbiddenError', async () => {
    workflowsManagementSetupMock.management.getWorkflow.mockResolvedValue({
      id: workflowId,
      managed: true,
      name: workflowId,
      enabled: true,
      createdAt: '2024-01-01T00:00:00Z',
      createdBy: 'test-user',
      lastUpdatedAt: '2024-01-01T00:00:00Z',
      lastUpdatedBy: 'test-user',
      definition: null,
      yaml: workflowYaml,
      valid: true,
    });

    await stepInstallWorkflowAssets(createContext());

    expect(workflowsManagementSetupMock.management.updateWorkflow).toHaveBeenCalledWith(
      workflowId,
      expect.objectContaining({
        yaml: expect.any(String),
        managed: true,
        managedBy: pkgName,
        managedVersion: null,
      }),
      spaceId,
      expect.anything(),
      { allowManagedWorkflowMutation: true }
    );
  });

  it('warns and forces disabled when unresolved placeholders exist and default_enabled is true', async () => {
    const logger = loggingSystemMock.createLogger();
    const unresolvedPlaceholder = 'REPLACE_WITH_JIRA_CONNECTOR_ID';
    const workflowWithPlaceholder = `name: my-workflow\nenabled: true\nconnectorId: ${unresolvedPlaceholder}\nsteps: []`;
    const context = createContext({
      logger,
      packageInstallContext: {
        packageInfo: {
          name: pkgName,
          version: pkgVersion,
          workflows: { default_enabled: true },
        },
        archiveIterator: createArchiveIteratorFromMap(
          new Map([
            [
              `${pkgName}-${pkgVersion}/kibana/workflow/${workflowFileName}`,
              Buffer.from(workflowWithPlaceholder),
            ],
          ])
        ),
      },
    });

    await stepInstallWorkflowAssets(context);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        `Workflow ${workflowId} has unresolved placeholders [${unresolvedPlaceholder}] — forcing disabled`
      )
    );
    expect(workflowsManagementSetupMock.management.createWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ yaml: expect.stringContaining('enabled: false') }),
      spaceId,
      expect.anything()
    );
  });

  it('does not warn about forcing disabled when unresolved placeholders exist but default_enabled is undefined', async () => {
    const logger = loggingSystemMock.createLogger();
    const unresolvedPlaceholder = 'REPLACE_WITH_JIRA_CONNECTOR_ID';
    const workflowWithPlaceholder = `name: my-workflow\nenabled: true\nconnectorId: ${unresolvedPlaceholder}\nsteps: []`;
    const context = createContext({
      logger,
      packageInstallContext: {
        packageInfo: {
          name: pkgName,
          version: pkgVersion,
        },
        archiveIterator: createArchiveIteratorFromMap(
          new Map([
            [
              `${pkgName}-${pkgVersion}/kibana/workflow/${workflowFileName}`,
              Buffer.from(workflowWithPlaceholder),
            ],
          ])
        ),
      },
    });

    await stepInstallWorkflowAssets(context);

    expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('forcing disabled'));
  });

  it('preserves step-level enabled values when applying default_enabled', async () => {
    const logger = loggingSystemMock.createLogger();
    const context = createContext({
      logger,
      packageInstallContext: {
        packageInfo: {
          name: pkgName,
          version: pkgVersion,
          workflows: { default_enabled: true },
        },
        archiveIterator: createArchiveIteratorFromMap(
          new Map([
            [
              `${pkgName}-${pkgVersion}/kibana/workflow/${workflowFileName}`,
              Buffer.from(workflowYaml),
            ],
          ])
        ),
      },
    });

    await stepInstallWorkflowAssets(context);

    expect(workflowsManagementSetupMock.management.createWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        yaml: expect.stringContaining('enabled: true'),
      }),
      spaceId,
      expect.anything()
    );
  });

  it('uses default_enabled false when no unresolved placeholders exist', async () => {
    const logger = loggingSystemMock.createLogger();
    const context = createContext({
      logger,
      packageInstallContext: {
        packageInfo: {
          name: pkgName,
          version: pkgVersion,
          workflows: { default_enabled: false },
        },
        archiveIterator: createArchiveIteratorFromMap(
          new Map([
            [
              `${pkgName}-${pkgVersion}/kibana/workflow/${workflowFileName}`,
              Buffer.from(workflowYaml),
            ],
          ])
        ),
      },
    });

    await stepInstallWorkflowAssets(context);

    expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('forcing disabled'));
    expect(workflowsManagementSetupMock.management.createWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ yaml: expect.stringContaining('enabled: false') }),
      spaceId,
      expect.anything()
    );
  });

  it('uses default_enabled true when no unresolved placeholders exist', async () => {
    const logger = loggingSystemMock.createLogger();
    const context = createContext({
      logger,
      packageInstallContext: {
        packageInfo: {
          name: pkgName,
          version: pkgVersion,
          workflows: { default_enabled: true },
        },
        archiveIterator: createArchiveIteratorFromMap(
          new Map([
            [
              `${pkgName}-${pkgVersion}/kibana/workflow/${workflowFileName}`,
              Buffer.from(workflowYaml),
            ],
          ])
        ),
      },
    });

    await stepInstallWorkflowAssets(context);

    expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('forcing disabled'));
    expect(workflowsManagementSetupMock.management.createWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ yaml: expect.stringContaining('enabled: true') }),
      spaceId,
      expect.anything()
    );
  });

  it('updates a managed workflow with the resolved enablement intent', async () => {
    const logger = loggingSystemMock.createLogger();
    workflowsManagementSetupMock.management.getWorkflow.mockResolvedValue({
      id: workflowId,
      managed: true,
      name: workflowId,
      enabled: true,
      createdAt: '2024-01-01T00:00:00Z',
      createdBy: 'test-user',
      lastUpdatedAt: '2024-01-01T00:00:00Z',
      lastUpdatedBy: 'test-user',
      definition: null,
      yaml: workflowYaml,
      valid: true,
    });

    const context = createContext({
      logger,
      packageInstallContext: {
        packageInfo: {
          name: pkgName,
          version: pkgVersion,
          workflows: { default_enabled: false },
        },
        archiveIterator: createArchiveIteratorFromMap(
          new Map([
            [
              `${pkgName}-${pkgVersion}/kibana/workflow/${workflowFileName}`,
              Buffer.from(workflowYaml),
            ],
          ])
        ),
      },
    });

    await stepInstallWorkflowAssets(context);

    expect(workflowsManagementSetupMock.management.updateWorkflow).toHaveBeenCalledWith(
      workflowId,
      expect.objectContaining({ yaml: expect.stringContaining('enabled: false') }),
      spaceId,
      expect.anything(),
      { allowManagedWorkflowMutation: true }
    );
  });

  it('rejects enabled scheduled-trigger workflows installed with no request context', async () => {
    const logger = loggingSystemMock.createLogger();
    const scheduledWorkflowYaml = `name: my-workflow
enabled: true
triggers:
  - type: scheduled
    with:
      every: 5m
steps: []`;

    workflowsManagementSetupMock.management.createWorkflow.mockRejectedValue(
      new Error('Unable to clone an API key, request does not contain an authorization header')
    );

    const context = createContext({
      logger,
      request: undefined,
      packageInstallContext: {
        packageInfo: {
          name: pkgName,
          version: pkgVersion,
          workflows: { default_enabled: true },
        },
        archiveIterator: createArchiveIteratorFromMap(
          new Map([
            [
              `${pkgName}-${pkgVersion}/kibana/workflow/${workflowFileName}`,
              Buffer.from(scheduledWorkflowYaml),
            ],
          ])
        ),
      },
    });

    await expect(stepInstallWorkflowAssets(context)).rejects.toThrow(
      'Unable to clone an API key, request does not contain an authorization header'
    );
  });
});
