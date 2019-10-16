/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState, useEffect } from 'react';
import { EuiPage, EuiPageBody, EuiPageWidthProps, ICON_TYPES } from '@elastic/eui';
import styled from 'styled-components';
import { PackageInfo } from '../../../common/types';
import { DetailViewPanelName } from '../../';
import { getPackageInfoByKey } from '../../data';
import { useCore } from '../../hooks/use_core';
import { Header } from './header';
import { Content } from './content';

export const DEFAULT_PANEL: DetailViewPanelName = 'overview';

export interface DetailProps {
  pkgkey: string;
  panel?: DetailViewPanelName;
}

export function Detail({ pkgkey, panel = DEFAULT_PANEL }: DetailProps) {
  const [info, setInfo] = useState<PackageInfo | null>(null);
  useEffect(() => {
    getPackageInfoByKey(pkgkey).then(response => {
      const { title } = response;
      setInfo({ ...response, title });
    });
  }, [pkgkey]);

  // don't have designs for loading/empty states
  if (!info) return null;

  return <DetailLayout restrictWidth={1200} {...info} panel={panel} />;
}

type LayoutProps = PackageInfo & Pick<DetailProps, 'panel'> & EuiPageWidthProps;
export function DetailLayout(props: LayoutProps) {
  const { name, restrictWidth, panel } = props;
  const { theme } = useCore();
  const iconType = ICON_TYPES.find(key => key.toLowerCase() === `logo${name}`);

  const FullWidthHeader = styled(EuiPage)`
    border-bottom: ${theme.eui.euiBorderThin}
    padding-bottom: ${theme.eui.paddingSizes.xl};
  `;

  const FullWidthRemainingHeight = styled(EuiPage)`
    background-color: ${theme.eui.euiColorEmptyShade};
    height: calc(100vh - ${topBarsHeight()}px);
  `;

  const FullWidthContent = panel === 'overview' ? FullWidthRemainingHeight : EuiPage;

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

function topBarsHeight() {
  const { theme } = useCore();
  const globalNav = parseInt(theme.eui.euiHeaderChildSize, 10);
  const pageTopNav = /* line-height */ 24 + /* padding-top */ 16 + /* padding-bottom */ 16;
  const title = /* line-height */ 48;
  const header = /* padding-top */ 16 + pageTopNav + title + /* padding-bottom */ 16;
  const topBarsTotal = globalNav + header;

  return topBarsTotal;
}
