/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';

import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { EuiLink, Query, Ast } from '@elastic/eui';

import {
  type InstallationInfo,
  type PackageListItem,
  KibanaSavedObjectType,
} from '../../../../../../../../common/types/models';
import { useFleetStatus, useStartServices } from '../../../../../hooks';

export const DashboardsCell: React.FunctionComponent<{ package: PackageListItem }> = ({
  package: { title, installationInfo },
}) => {
  const { spaceId = DEFAULT_SPACE_ID } = useFleetStatus();
  const core = useStartServices();

  const packageTagQueryClause = useMemo(() => {
    const ast = Ast.create([]);
    return new Query(ast.addOrFieldValue('tag', title, true, 'eq')).text;
  }, [title]);

  const link = core.http.basePath.prepend(`/app/dashboards#/list?s=${packageTagQueryClause}`);

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
