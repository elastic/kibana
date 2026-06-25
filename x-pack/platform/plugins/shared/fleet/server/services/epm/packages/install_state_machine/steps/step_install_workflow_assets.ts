/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

import pMap from 'p-map';

import type { SavedObjectsClientContract } from '@kbn/core/server';

import { KibanaAssetType, KibanaSavedObjectType } from '../../../../../../common/types';
import type { KibanaAssetReference } from '../../../../../../common/types';
import { getPathParts } from '../../../archive';
import { appContextService } from '../../../../app_context';
import { packagePolicyService } from '../../../../package_policy';
import { saveKibanaAssetsRefs } from '../../install';
import { withPackageSpan } from '../../utils';
import type { InstallContext } from '../_state_machine_package_install';

const GITHUB_CONNECTOR_PLACEHOLDER = 'REPLACE_WITH_GITHUB_CONNECTOR_ID';
const SLACK_CONNECTOR_PLACEHOLDER = 'REPLACE_WITH_SLACK_CONNECTOR_ID';
const SALESFORCE_CONNECTOR_PLACEHOLDER = 'REPLACE_WITH_SALESFORCE_CONNECTOR_ID';
const SALESFORCE_CASE_GITHUB_FIELD_PLACEHOLDER = 'REPLACE_WITH_SALESFORCE_CASE_GITHUB_FIELD';
const SALESFORCE_PRODUCT_AREA_FIELD_PLACEHOLDER = 'REPLACE_WITH_SALESFORCE_PRODUCT_AREA_FIELD';
const SDH_REPO_PATTERN_PLACEHOLDER = 'REPLACE_WITH_SDH_REPO_PATTERN';
const SDH_LABEL_PLACEHOLDER = 'REPLACE_WITH_SDH_LABEL';
const GDRIVE_CONNECTOR_PLACEHOLDER = 'REPLACE_WITH_GDRIVE_CONNECTOR_ID';
const GDRIVE_ROADMAP_FOLDER_IDS_PLACEHOLDER = 'REPLACE_WITH_GDRIVE_ROADMAP_FOLDER_IDS';
const ORG_LOGIN_PLACEHOLDER = 'REPLACE_WITH_ORG_LOGIN';

const formatManifestVarForSubstitution = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    const joined = value
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0)
      .join(',');
    return joined.length > 0 ? joined : undefined;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  return undefined;
};

export const substituteWorkflowConnectorIds = (
  yaml: string,
  vars: Record<string, unknown>
): string => {
  let result = yaml;
  const githubConnectorId = vars.github_connector_id;
  const slackConnectorId = vars.slack_connector_id;
  const salesforceConnectorId = vars.salesforce_connector_id;
  const salesforceCaseGithubField = vars.salesforce_case_github_field;
  const salesforceProductAreaField = vars.salesforce_product_area_field;
  const sdhRepoPattern = vars.sdh_repo_pattern;
  const sdhLabel = vars.sdh_label;
  const googleDriveConnectorId = vars.google_drive_connector_id;
  const gdriveRoadmapFolderIds = formatManifestVarForSubstitution(vars.gdrive_roadmap_folder_ids);
  const orgLogin = vars.org_login;

  if (typeof githubConnectorId === 'string' && githubConnectorId.length > 0) {
    result = result.replaceAll(GITHUB_CONNECTOR_PLACEHOLDER, githubConnectorId);
  }
  if (typeof slackConnectorId === 'string' && slackConnectorId.length > 0) {
    result = result.replaceAll(SLACK_CONNECTOR_PLACEHOLDER, slackConnectorId);
  }
  if (typeof salesforceConnectorId === 'string' && salesforceConnectorId.length > 0) {
    result = result.replaceAll(SALESFORCE_CONNECTOR_PLACEHOLDER, salesforceConnectorId);
  }
  if (typeof salesforceCaseGithubField === 'string' && salesforceCaseGithubField.length > 0) {
    result = result.replaceAll(SALESFORCE_CASE_GITHUB_FIELD_PLACEHOLDER, salesforceCaseGithubField);
  }
  if (typeof salesforceProductAreaField === 'string' && salesforceProductAreaField.length > 0) {
    result = result.replaceAll(
      SALESFORCE_PRODUCT_AREA_FIELD_PLACEHOLDER,
      salesforceProductAreaField
    );
  }
  if (typeof sdhRepoPattern === 'string' && sdhRepoPattern.length > 0) {
    result = result.replaceAll(SDH_REPO_PATTERN_PLACEHOLDER, sdhRepoPattern);
  }
  if (typeof sdhLabel === 'string' && sdhLabel.length > 0) {
    result = result.replaceAll(SDH_LABEL_PLACEHOLDER, sdhLabel);
  }
  if (typeof googleDriveConnectorId === 'string' && googleDriveConnectorId.length > 0) {
    result = result.replaceAll(GDRIVE_CONNECTOR_PLACEHOLDER, googleDriveConnectorId);
  }
  if (gdriveRoadmapFolderIds) {
    result = result.replaceAll(GDRIVE_ROADMAP_FOLDER_IDS_PLACEHOLDER, gdriveRoadmapFolderIds);
  }
  if (typeof orgLogin === 'string' && orgLogin.length > 0) {
    result = result.replaceAll(ORG_LOGIN_PLACEHOLDER, orgLogin);
  }

  return result;
};

export const resolvePackagePolicyConnectorVars = async (
  savedObjectsClient: SavedObjectsClientContract,
  pkgName: string
): Promise<Record<string, unknown>> => {
  try {
    const policies = await packagePolicyService.list(savedObjectsClient, {
      perPage: 20,
      kuery: `ingest-package-policies.package.name:${pkgName}`,
    });
    const policy = policies.items.find((item) => item.package?.name === pkgName);
    if (!policy?.vars) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(policy.vars).map(([key, config]) => [key, config.value ?? config])
    );
  } catch {
    return {};
  }
};

export const getFleetPackageWorkflowId = (params: {
  pkgName: string;
  spaceId: string;
  fileName: string;
}): string => {
  const baseName = params.fileName.replace(/\.ya?ml$/i, '');
  return `fleet-${params.spaceId}-${params.pkgName}-${baseName}`;
};

export async function stepInstallWorkflowAssets(
  context: Pick<
    InstallContext,
    'logger' | 'savedObjectsClient' | 'packageInstallContext' | 'spaceId' | 'request'
  > & { installAsAdditionalSpace?: boolean }
) {
  const { logger, savedObjectsClient, packageInstallContext, spaceId, installAsAdditionalSpace } =
    context;
  const { packageInfo } = packageInstallContext;
  const { name: pkgName } = packageInfo;
  const workflowsApi = appContextService.getWorkflowsManagementSetup()?.management;

  if (!workflowsApi) {
    logger.debug(
      `Skipping workflow asset installation for ${pkgName}: workflowsManagement unavailable`
    );
    return;
  }

  if (!context.request) {
    logger.debug(
      `Skipping workflow asset installation for ${pkgName}: missing install request context`
    );
    return;
  }

  await withPackageSpan(`Install package workflows for ${pkgName}`, async () => {
    const workflowEntries: Array<{ fileName: string; yaml: string }> = [];

    await packageInstallContext.archiveIterator.traverseEntries(
      async (entry) => {
        if (!entry.buffer) {
          return;
        }

        workflowEntries.push({
          fileName: path.basename(entry.path),
          yaml: entry.buffer.toString('utf8'),
        });
      },
      (entryPath) => {
        const parts = getPathParts(entryPath);
        return parts.service === 'kibana' && parts.type === KibanaAssetType.workflow;
      }
    );

    if (workflowEntries.length === 0) {
      return;
    }

    const connectorVars = await resolvePackagePolicyConnectorVars(savedObjectsClient, pkgName);

    const assetRefs: KibanaAssetReference[] = [];

    await pMap(
      workflowEntries,
      async ({ fileName, yaml }) => {
        const workflowId = getFleetPackageWorkflowId({ pkgName, spaceId, fileName });
        const workflowYaml = substituteWorkflowConnectorIds(yaml, connectorVars);
        const existingWorkflow = await workflowsApi.getWorkflow(workflowId, spaceId);

        if (existingWorkflow) {
          await workflowsApi.updateWorkflow(
            workflowId,
            { yaml: workflowYaml },
            spaceId,
            context.request!
          );
        } else {
          await workflowsApi.createWorkflow(
            { id: workflowId, yaml: workflowYaml },
            spaceId,
            context.request!
          );
        }

        assetRefs.push({
          id: workflowId,
          type: KibanaSavedObjectType.workflow,
        });
      },
      { concurrency: 3 }
    );

    await saveKibanaAssetsRefs(
      savedObjectsClient,
      pkgName,
      assetRefs,
      spaceId,
      installAsAdditionalSpace,
      true
    );
  });
}
