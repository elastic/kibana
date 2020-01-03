/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiPage, EuiPageBody, EuiPageProps, ICON_TYPES } from '@elastic/eui';
import React, { Fragment, useEffect, useState } from 'react';
import styled from 'styled-components';
import { DetailViewPanelName } from '../../';
import { PackageInfo } from '../../../common/types';
import { getPackageInfoByKey } from '../../data';
import { useSetPackageInstallStatus } from '../../hooks';
import { useCore } from '../../hooks/use_core';
import { InstallStatus } from '../../types';
import { Content } from './content';
import { Header } from './header';

export const DEFAULT_PANEL: DetailViewPanelName = 'overview';

export interface DetailProps {
  pkgkey: string;
  panel?: DetailViewPanelName;
}

export function Detail({ pkgkey, panel = DEFAULT_PANEL }: DetailProps) {
  const [info, setInfo] = useState<PackageInfo | null>(null);
  const setPackageInstallStatus = useSetPackageInstallStatus();
  useEffect(() => {
    getPackageInfoByKey(pkgkey).then(response => {
      const { title, name } = response;
      const status: InstallStatus = response.status as any;
      // track install status state
      setPackageInstallStatus({ name, status });
      setInfo({ ...response, title });
    });
  }, [pkgkey, setPackageInstallStatus]);

  // don't have designs for loading/empty states
  if (!info) return null;

  return <DetailLayout restrictWidth={1200} {...info} panel={panel} />;
}

type LayoutProps = PackageInfo & Pick<DetailProps, 'panel'> & Pick<EuiPageProps, 'restrictWidth'>;
export function DetailLayout(props: LayoutProps) {
  const { name, restrictWidth } = props;
  const { theme } = useCore();
  const iconType = ICON_TYPES.find(key => key.toLowerCase() === `logo${name}`);

  const FullWidthHeader = styled(EuiPage)`
    border-bottom: ${theme.eui.euiBorderThin};
    padding-bottom: ${theme.eui.paddingSizes.xl};
  `;

  const paddingSizeTop: number = parseInt(theme.eui.paddingSizes.xl, 10) * 1.25;
  const FullWidthContent = styled(EuiPage)`
    background-color: ${theme.eui.euiColorEmptyShade};
    padding-top: ${paddingSizeTop}px;
    flex-grow: 1;
  `;

  return (
    <Fragment>
      <FullWidthHeader>
        <EuiPageBody restrictWidth={restrictWidth}>
          <Header iconType={iconType} {...props} />
        </EuiPageBody>
      </FullWidthHeader>
      <FullWidthContent>
        <EuiPageBody restrictWidth={restrictWidth}>
          <Content hasIconPanel={!!iconType} {...props} />
        </EuiPageBody>
      </FullWidthContent>
    </Fragment>
  );
}
