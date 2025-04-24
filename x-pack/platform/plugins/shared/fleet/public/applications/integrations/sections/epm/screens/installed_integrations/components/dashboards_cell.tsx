/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';

import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';

import {
  type InstallationInfo,
  KibanaSavedObjectType,
} from '../../../../../../../../common/types/models';
import { useFleetStatus } from '../../../../../hooks';

export const DashboardsCell: React.FunctionComponent<{ installation: InstallationInfo }> = ({
  installation,
}) => {
  const { spaceId = DEFAULT_SPACE_ID } = useFleetStatus();

  const dashboardsCount = useMemo(() => {
    return getDashboardsCount(installation, spaceId);
  }, [installation, spaceId]);

  if (dashboardsCount === 0) {
    return '-';
  }

  return <>{dashboardsCount}</>;
};

const getDashboardsCount = (installation: InstallationInfo, spaceId: string) => {
  const assets =
    installation.installed_kibana_space_id === spaceId
      ? installation.installed_kibana
      : installation?.additional_spaces_installed_kibana?.[spaceId];

  if (!assets || assets.length === 0) {
    return 0;
  }

  return assets.filter(({ type }) => type === KibanaSavedObjectType.dashboard).length;
};
