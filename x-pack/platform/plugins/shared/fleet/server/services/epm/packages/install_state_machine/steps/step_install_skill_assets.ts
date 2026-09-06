/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Under the Elastic License 2.0, the
 * GNU AGPLv3, or the SSPLv1, at your election: the "Elastic License 2.0", the
 * "GNU Affero General Public License v3.0 only", or the "Server Side Public
 * License, v 1"; you may not use this file except in compliance with, at your
 * election, the "Elastic License 2.0", the "GNU Affero General Public License
 * v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';

import { KibanaAssetType, KibanaSavedObjectType } from '../../../../../../common/types';
import type { KibanaAssetReference } from '../../../../../../common/types';
import { getPathParts } from '../../../archive';
import { appContextService } from '../../../../app_context';
import { saveKibanaAssetsRefs } from '../../install';
import { withPackageSpan } from '../../utils';
import type { InstallContext } from '../_state_machine_package_install';
import { getFleetPackageSkillId, parseFleetSkillYaml } from './fleet_skill_parse';

/**
 * AB-005: install `kibana/skill/<dir>/SKILL.md` assets as persisted,
 * package-managed skills (readonly, plugin_id `fleet:<pkg>`).
 */
export async function stepInstallSkillAssets(
  context: Pick<
    InstallContext,
    'logger' | 'savedObjectsClient' | 'packageInstallContext' | 'spaceId' | 'request'
  > & { installAsAdditionalSpace?: boolean }
) {
  const { logger, savedObjectsClient, packageInstallContext, spaceId, installAsAdditionalSpace } =
    context;
  const { packageInfo } = packageInstallContext;
  const { name: pkgName } = packageInfo;
  const agentBuilderApi = appContextService.getAgentBuilderSetup()?.management;

  if (!agentBuilderApi) {
    logger.debug(`Skipping skill asset installation for ${pkgName}: agentBuilder unavailable`);
    return;
  }
  logger.info(`AB005-TRACE entering skill install for ${pkgName}`);
  await withPackageSpan(`Install package skills for ${pkgName}`, async () => {
    const skillEntries: Array<{ fileName: string; content: string }> = [];
    await packageInstallContext.archiveIterator.traverseEntries(
      async (entry) => {
        if (!entry.buffer) {
          return;
        }
        // Archive entries are prefixed with `<pkg>-<version>/`, so anchor on the
        // kibana/skill/ segment anywhere in the path rather than at the start.
        const rel = entry.path.replace(/^.*?kibana\/skill\//, '');
        skillEntries.push({
          fileName: rel,
          content: entry.buffer.toString('utf8'),
        });
      },
      (entryPath) => {
        const parts = getPathParts(entryPath);
        if (entryPath.includes('/skill/')) {
          logger.info(`AB005-TRACE path=${entryPath} service=${parts.service} type=${parts.type}`);
        }
        return (
          parts.service === 'kibana' &&
          parts.type === KibanaAssetType.skill &&
          path.basename(entryPath).toUpperCase() === 'SKILL.MD'
        );
      }
    );
    logger.info(`AB005-TRACE skillEntries=${skillEntries.length} names=${JSON.stringify(skillEntries.map((e) => e.fileName))}`);
    if (skillEntries.length === 0) {
      return;
    }
    const assetRefs: KibanaAssetReference[] = [];
    for (const { fileName, content } of skillEntries) {
      const skillId = getFleetPackageSkillId({ pkgName, spaceId, fileName });
      const definition = parseFleetSkillYaml({ fileName, content }, skillId, pkgName);
      await agentBuilderApi.createOrUpdateSkill(definition, context.request!);
      assetRefs.push({ id: skillId, type: KibanaSavedObjectType.skill });
    }
    await saveKibanaAssetsRefs(
      savedObjectsClient as never,
      pkgName,
      assetRefs,
      spaceId,
      installAsAdditionalSpace,
      true
    );
    logger.info(`Installed ${assetRefs.length} skill asset(s) for ${pkgName}`);
  });
}
