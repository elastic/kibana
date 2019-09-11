/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonEmptyProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiTitle,
  IconType,
} from '@elastic/eui';
import styled from 'styled-components';
import { PLUGIN } from '../../../common/constants';
import { IntegrationInfo } from '../../../common/types';
import { VersionBadge } from '../../components/version_badge';
import { IconPanel } from '../../components/icon_panel';
import { useBreadcrumbs, useCore, useLinks } from '../../hooks';
import { CenterColumn, LeftColumn, RightColumn } from './layout';

type HeaderProps = IntegrationInfo & { iconType?: IconType };

export function Header(props: HeaderProps) {
  const { iconType, title, version } = props;
  const { theme } = useCore();
  const { toListView } = useLinks();
  useBreadcrumbs([{ text: PLUGIN.TITLE, href: toListView() }, { text: title }]);

  const FullWidthNavRow = styled(EuiPage)`
    /* no left padding so link is against column left edge  */
    padding-left: 0;
  `;

  const Text = styled.span`
    margin-right: ${theme.eui.spacerSizes.xl};
  `;

  return (
    <Fragment>
      <FullWidthNavRow>
        <NavButtonBack />
      </FullWidthNavRow>
      <EuiFlexGroup>
        {iconType ? (
          <LeftColumn>
            <IconPanel iconType={iconType} />
          </LeftColumn>
        ) : null}
        <CenterColumn>
          <EuiTitle size="l">
            <h1>
              <Text>{title}</Text>
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
  const { theme } = useCore();
  const ButtonEmpty = styled(EuiButtonEmpty).attrs<EuiButtonEmptyProps>({
    href: toListView(),
  })`
    margin-right: ${theme.eui.spacerSizes.xl};
  `;

  return (
    <ButtonEmpty iconType="arrowLeft" size="xs" flush="left">
      Browse Integrations
    </ButtonEmpty>
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
