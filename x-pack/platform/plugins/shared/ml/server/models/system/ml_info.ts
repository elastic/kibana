/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { MlInfoResponse } from '@kbn/ml-common-types/ml_server_info';
import type { MlClient } from '../../lib/ml_client';
import { getLazyMlNodeCount } from '../../lib/node_utils';
import { getIsMlCpsEnabled } from '../../lib/cps_utils';
import type { ServerlessInfo } from '../../types';

export async function getMlInfo({
  mlClient,
  client,
  cloud,
  serverless,
}: {
  mlClient: MlClient;
  client: IScopedClusterClient;
  cloud?: CloudSetup;
  serverless: ServerlessInfo;
}): Promise<MlInfoResponse> {
  const body = await mlClient.info();
  const cloudId = cloud?.cloudId;
  const isCloudTrial = cloud?.isInTrial() ?? false;

  let isMlAutoscalingEnabled = false;
  try {
    // kibana_system user does not have the manage_autoscaling cluster privilege.
    // perform this check as a current user.
    await client.asCurrentUser.autoscaling.getAutoscalingPolicy({ name: 'ml' });
    isMlAutoscalingEnabled = true;
  } catch (e) {
    // If ml autoscaling policy doesn't exist or the user does not have privileges to fetch it,
    // check the number of lazy ml nodes to determine if autoscaling is enabled.
    const lazyMlNodeCount = await getLazyMlNodeCount(client);
    isMlAutoscalingEnabled = lazyMlNodeCount > 0;
  }

  const isMlCpsEnabled = serverless.cpsEnabled && (await getIsMlCpsEnabled(client));

  return {
    ...body,
    cloudId,
    isCloudTrial,
    cloudUrl: cloud?.baseUrl,
    isMlAutoscalingEnabled,
    isMlCpsEnabled,
    showNodeInfo: !serverless.isServerless,
    showLicenseInfo: !serverless.isServerless,
  } as MlInfoResponse;
}
