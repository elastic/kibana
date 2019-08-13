/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiTitle,
  IconType,
} from '@elastic/eui';
import { PLUGIN } from '../../../common/constants';
import { IntegrationInfo } from '../../../common/types';
import { VersionBadge } from '../../components/version_badge';
import { IconPanel } from './icon_panel';
import { useBreadcrumbs, useLinks } from '../../hooks';
import { CenterColumn, LeftColumn, RightColumn } from './layout';

type HeaderProps = IntegrationInfo & { iconType?: IconType };

export function Header(props: HeaderProps) {
  const { iconType, title, version } = props;
  const { toListView } = useLinks();
  useBreadcrumbs([{ text: PLUGIN.TITLE, href: toListView() }, { text: title }]);

  return (
    <Fragment>
      {/* no left padding so link is against column left edge  */}
      <EuiPage style={{ paddingLeft: '0' }}>
        <NavButtonBack />
      </EuiPage>
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
              <InstallationButton {...props} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </RightColumn>
      </EuiFlexGroup>
    </Fragment>
  );
}

function NavButtonBack() {
  const { toListView } = useLinks();
  return (
    <EuiButtonEmpty
      href={toListView()}
      iconType="arrowLeft"
      size="xs"
      flush="left"
      style={{ marginRight: '32px' }}
    >
      Browse Integrations
    </EuiButtonEmpty>
  );
}

function InstallationButton({ status }: IntegrationInfo) {
  const isInstalled = status === 'installed';
  const iconType = isInstalled ? '' : 'plusInCircle';
  const buttonText = isInstalled ? 'Installed' : 'Add Integration';

  return (
    <EuiButton fill={!isInstalled} iconType={iconType}>
      {buttonText}
    </EuiButton>
  );
}
