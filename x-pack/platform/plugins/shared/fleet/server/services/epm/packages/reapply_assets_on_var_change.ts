/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

import { KibanaSavedObjectType } from '../../../types';

import * as Registry from '../registry';

import { createFleetInternalRequest } from '../../security/fake_request';

import { stepInstallAgentAssets } from './install_state_machine/steps/step_install_agent_assets';
import { stepInstallWorkflowAssets } from './install_state_machine/steps/step_install_workflow_assets';
import { getInstallationObject } from './get';

/**
 * FLEET-004: detect whether a package policy's vars changed between revisions.
 *
 * Vars are an ordered map of name -> { value, ... }; a JSON comparison is sufficient to
 * detect any meaningful change a user could make through the update API.
 */
export const hasPackagePolicyVarsChanged = (
  oldVars: Record<string, unknown> | undefined,
  newVars: Record<string, unknown> | undefined
): boolean => JSON.stringify(oldVars ?? {}) !== JSON.stringify(newVars ?? {});

/**
 * FLEET-004: re-apply workflow/agent placeholder substitution for an installed package
 * after one of its package policies' vars changed (e.g. a rotated connector id), so the
 * already-installed workflow/agent assets are updated in place without a full reinstall.
 *
 * The install steps re-read the current package policy vars themselves via
 * `resolvePackagePolicyConnectorVars`, so re-invoking them after the updated policy has
 * been persisted applies the new values. Reuses the createOrUpdate path, which preserves
 * operator-managed edits (carry-forward) for any value the new vars no longer resolve.
 *
 * No-ops for packages that do not ship workflow/agent assets. Callers must catch failures
 * so a re-apply error never breaks the package policy update itself.
 */
export const reapplyPackageWorkflowAssetsOnVarChange = async ({
  pkgName,
  savedObjectsClient,
  logger,
}: {
  pkgName: string;
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}): Promise<void> => {
  const installationSO = await getInstallationObject({ savedObjectsClient, pkgName });
  if (!installationSO) {
    logger.debug(`FLEET-004 re-apply: ${pkgName} is not installed, skipping`);
    return;
  }
  const installation = installationSO.attributes;

  const shipsWorkflowOrAgentAssets = installation.installed_kibana?.some(
    (asset) =>
      asset.type === KibanaSavedObjectType.workflow || asset.type === KibanaSavedObjectType.agent
  );
  if (!shipsWorkflowOrAgentAssets) {
    logger.debug(
      `FLEET-004 re-apply: ${pkgName} ships no workflow/agent assets, skipping substitution`
    );
    return;
  }

  const { packageInfo, paths, archiveIterator } = await Registry.getPackage(
    pkgName,
    installation.version,
    { useStreaming: true }
  );
  const packageInstallContext = { packageInfo, paths, archiveIterator };
  const spaceId = installation.installed_kibana_space_id ?? DEFAULT_SPACE_ID;
  const request = createFleetInternalRequest();

  await stepInstallWorkflowAssets({
    logger,
    savedObjectsClient,
    packageInstallContext,
    spaceId,
    request,
  });
  await stepInstallAgentAssets({
    logger,
    savedObjectsClient,
    packageInstallContext,
    spaceId,
    request,
  });

  logger.info(
    `FLEET-004: re-applied workflow/agent assets for ${pkgName} after a package policy vars change`
  );
};
