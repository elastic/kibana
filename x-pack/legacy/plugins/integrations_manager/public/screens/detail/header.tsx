/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiTitle, IconType } from '@elastic/eui';
import { IntegrationInfo } from '../../../common/types';
import { VersionBadge } from '../../components/version_badge';
import { IconPanel } from './icon_panel';
import { CenterColumn, LeftColumn, RightColumn } from './layout';

type HeaderProps = IntegrationInfo & { iconType?: IconType };

export function Header(props: HeaderProps) {
  const { iconType, status, title, version } = props;
  const isInstalled = status === 'installed';

  return (
    <EuiFlexGroup>
      {iconType ? (
        <LeftColumn>
          <IconPanel iconType={iconType} />
        </LeftColumn>
      ) : null}
      <CenterColumn>
        <EuiTitle size="l">
          <h1>
            <span style={{ marginRight: '1rem' }}>{title}</span>
            <VersionBadge version={version} />
          </h1>
        </EuiTitle>
      </CenterColumn>
      <RightColumn>
        <EuiFlexGroup direction="column" alignItems="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton
              fill={!isInstalled}
              iconType={isInstalled ? '' : 'plusInCircle'}
              fullWidth={false}
            >
              {isInstalled ? 'Installed' : 'Add Integration'}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </RightColumn>
    </EuiFlexGroup>
  );
}
