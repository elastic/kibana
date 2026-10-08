/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import { DEFAULT_DOWNLOAD_SOURCE_REFERENCE } from '../../constants';
import { downloadSourceService } from '../../services';
import { appContextService } from '../../services/app_context';
import type { AgentPolicy, DownloadSource } from '../../types';
import { FleetError, DownloadSourceNotFound } from '../../errors';

export const getDownloadSourcesForAgentPolicy = async (
  agentPolicy: AgentPolicy
): Promise<DownloadSource[]> => {
  const defaultDownloadSourceId = await downloadSourceService.getDefaultDownloadSourceId();

  if (!defaultDownloadSourceId) {
    throw new FleetError('Default download source host is not setup');
  }

  const ids =
    agentPolicy.download_source_ids && agentPolicy.download_source_ids.length > 0
      ? agentPolicy.download_source_ids
      : agentPolicy.download_source_id
      ? [agentPolicy.download_source_id]
      : [defaultDownloadSourceId];

  const logger = appContextService.getLogger().get('getDownloadSourcesForAgentPolicy');
  const resolved = await Promise.all(
    ids.map(async (id) => {
      const resolvedId = id === DEFAULT_DOWNLOAD_SOURCE_REFERENCE ? defaultDownloadSourceId : id;
      try {
        return await downloadSourceService.get(resolvedId);
      } catch (e) {
        if (!SavedObjectsErrorHelpers.isNotFoundError(e)) {
          throw e;
        }
        logger.warn(`Download source host not found ${resolvedId}, skipping`);
        return null;
      }
    })
  );

  const sources = resolved.filter((s): s is DownloadSource => s !== null);

  if (sources.length === 0) {
    let defaultSource: DownloadSource;
    try {
      defaultSource = await downloadSourceService.get(defaultDownloadSourceId);
    } catch (e) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw e;
      }
      throw new DownloadSourceNotFound(`Download source host not found ${defaultDownloadSourceId}`);
    }
    return [defaultSource];
  }

  return sources;
};

/** @deprecated Use getDownloadSourcesForAgentPolicy instead */
export const getDownloadSourceForAgentPolicy = async (
  agentPolicy: AgentPolicy
): Promise<DownloadSource> => {
  const [primary] = await getDownloadSourcesForAgentPolicy(agentPolicy);
  return primary;
};
