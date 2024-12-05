/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';

import type { GetInfoResponse } from '../../../../../../common';

export function getDashboardIdForSpace(
  spaceId: string = DEFAULT_SPACE_ID,
  res: GetInfoResponse | undefined,
  dashboardId: string
) {
  if (res?.item?.status !== 'installed') {
    return dashboardId;
  }

  const installationInfo = res.item.installationInfo;

  if (!installationInfo || installationInfo?.installed_kibana_space_id === spaceId) {
    return dashboardId;
  }

  return (
    installationInfo.additional_spaces_installed_kibana?.[spaceId]?.find(
      ({ originId }) => originId === dashboardId
    )?.id ?? dashboardId
  );
}
