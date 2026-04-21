/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';

import type { Logger } from '@kbn/logging';
import type { SavedObject } from '@kbn/core/server';

import { appContextService } from '../../services';
import { PACKAGES_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '../../constants';
import type { Installation } from '../../types';
import { AgentlessDeploymentReleaseStatus } from '../../../common/types';
import type { RegistryPolicyTemplate } from '../../../common/types';
import { FLEET_CLOUD_SECURITY_POSTURE_CSPM_POLICY_TEMPLATE } from '../../../common/constants';
import * as Registry from '../../services/epm/registry';

const BATCH_SIZE = 50;

// CSPM's agentless feature was GA before the release field was introduced — explicitly backfill GA.
function buildCSPMDeploymentInfo(t: RegistryPolicyTemplate) {
  if (t.deployment_modes?.agentless?.enabled && !t.deployment_modes.agentless.release) {
    return {
      name: t.name,
      deployment_modes: {
        ...t.deployment_modes,
        agentless: {
          ...t.deployment_modes?.agentless,
          release: AgentlessDeploymentReleaseStatus.GA,
        },
      },
    };
  }
  return { name: t.name, deployment_modes: t.deployment_modes };
}

async function buildDeploymentInfoUpdates(
  batch: Array<SavedObject<Installation>>,
  logger: Logger,
  abortController: AbortController
): Promise<Array<{ id: string; policy_templates_deployment_info: unknown }>> {
  const updates: Array<{ id: string; policy_templates_deployment_info: unknown }> = [];

  for (const so of batch) {
    if (abortController.signal.aborted) return updates;

    const { name, version } = so.attributes;

    try {
      const pkgInfo = await Registry.fetchInfo(name, version);
      updates.push({
        id: so.id,
        policy_templates_deployment_info:
          pkgInfo.policy_templates?.map((t: RegistryPolicyTemplate) => {
            if (t.name === FLEET_CLOUD_SECURITY_POSTURE_CSPM_POLICY_TEMPLATE) {
              return buildCSPMDeploymentInfo(t);
            }
            return { name: t.name, deployment_modes: t.deployment_modes };
          }) ?? [],
      });
    } catch (err) {
      logger.warn(
        `Failed to fetch registry info for ${name}@${version} during backfill: ${err.message}`
      );
    }
  }

  return updates;
}

export async function runBackfillInstalledPackageInfo({
  logger,
  abortController,
}: {
  logger: Logger;
  abortController: AbortController;
}): Promise<void> {
  const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();

  const res = await soClient.find<Installation>({
    type: PACKAGES_SAVED_OBJECT_TYPE,
    perPage: SO_SEARCH_LIMIT,
    filter: `${PACKAGES_SAVED_OBJECT_TYPE}.attributes.install_status:installed and ${PACKAGES_SAVED_OBJECT_TYPE}.attributes.install_source:registry and not ${PACKAGES_SAVED_OBJECT_TYPE}.attributes.policy_templates_deployment_info:*`,
    fields: ['name', 'version'],
  });

  if (res.total === 0) {
    logger.debug('No packages require policy_templates_deployment_info backfill');
    return;
  }

  logger.info(`Backfilling policy_templates_deployment_info for ${res.total} installed packages`);

  for (const batch of chunk(res.saved_objects, BATCH_SIZE)) {
    if (abortController.signal.aborted) {
      logger.warn('policy_templates_deployment_info backfill was aborted');
      return;
    }

    const updates = await buildDeploymentInfoUpdates(batch, logger, abortController);

    if (updates.length > 0) {
      await soClient.bulkUpdate(
        updates.map(({ id, policy_templates_deployment_info }) => ({
          type: PACKAGES_SAVED_OBJECT_TYPE,
          id,
          attributes: { policy_templates_deployment_info },
        }))
      );
    }
  }

  logger.info('Completed policy_templates_deployment_info backfill');
}
