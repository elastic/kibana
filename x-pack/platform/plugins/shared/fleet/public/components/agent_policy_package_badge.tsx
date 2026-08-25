/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiBadge } from '@elastic/eui';

import { FLEET_SERVER_PACKAGE } from '../../common/constants';

import { PackageIcon } from '.';

interface Props {
  excludeFleetServer?: boolean;
  pkgName: string;
  pkgVersion?: string;
  pkgTitle: string;
}

export const AgentPolicyPackageBadge: React.FunctionComponent<Props> = ({
  excludeFleetServer,
  pkgName,
  pkgVersion,
  pkgTitle,
}) => {
  return (
    <EuiBadge color="hollow" isDisabled={excludeFleetServer && pkgName === FLEET_SERVER_PACKAGE}>
      <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <PackageIcon
            packageName={pkgName}
            version={pkgVersion || ''}
            tryApi={pkgVersion !== undefined}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{pkgTitle}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiBadge>
  );
};
