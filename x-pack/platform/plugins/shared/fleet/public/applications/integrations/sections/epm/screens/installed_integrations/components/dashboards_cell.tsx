/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';

import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { EuiLink } from '@elastic/eui';

import type { PackageListItem } from '../../../../../../../../common/types/models';
import { useFleetStatus, useStartServices } from '../../../../../hooks';
import { getDashboardsCount, buildDashboardsListLink } from '../../../../../../../services';

export const DashboardsCell: React.FunctionComponent<{ package: PackageListItem }> = ({
  package: { title, installationInfo },
}) => {
  const { spaceId = DEFAULT_SPACE_ID } = useFleetStatus();
  const core = useStartServices();

  const link = useMemo(
    () => buildDashboardsListLink(core.http.basePath, title),
    [core.http.basePath, title]
  );

  const dashboardsCount = useMemo(() => {
    if (!installationInfo) {
      return 0;
    }
    return getDashboardsCount(installationInfo, spaceId);
  }, [installationInfo, spaceId]);

  if (dashboardsCount === 0) {
    return '-';
  }

  return (
    <EuiLink data-test-subj="installedIntegrationsDashboardsLink" href={link}>
      {dashboardsCount}
    </EuiLink>
  );
};
