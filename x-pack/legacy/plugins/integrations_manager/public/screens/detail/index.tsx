/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState, useEffect } from 'react';
import { EuiPage, EuiPageBody, EuiPageWidthProps, ICON_TYPES } from '@elastic/eui';
import { IntegrationInfo } from '../../../common/types';
import { DetailViewPanelName } from '../../';
import { getIntegrationInfoByKey } from '../../data';
import { Header } from './header';
import { Content } from './content';

export const ICON_HEIGHT_PANEL = 164;
export const ICON_HEIGHT_NATURAL = 32;
export const DEFAULT_PANEL: DetailViewPanelName = 'overview';

export interface DetailProps {
  pkgkey: string;
  panel?: DetailViewPanelName;
}

export function Detail({ pkgkey, panel = DEFAULT_PANEL }: DetailProps) {
  const [info, setInfo] = useState<IntegrationInfo | null>(null);
  useEffect(() => {
    getIntegrationInfoByKey(pkgkey).then(response => {
      const { title } = response;
      setInfo({ ...response, title });
    });
  }, [pkgkey]);

  // don't have designs for loading/empty states
  if (!info) return null;

  return <DetailLayout restrictWidth={1200} {...info} panel={panel} />;
}

type LayoutProps = IntegrationInfo & Pick<DetailProps, 'panel'> & EuiPageWidthProps;
export function DetailLayout(props: LayoutProps) {
  const { name, restrictWidth, panel } = props;
  const iconType = ICON_TYPES.find(key => key.toLowerCase() === `logo${name}`);
  const headerStyles = { borderBottom: '1px solid #D3DAE6', paddingBottom: '32px' };
  const contentStyles = panel === 'overview' ? overviewContentStyles() : {};

  return (
    <Fragment>
      <EuiPage style={headerStyles}>
        <EuiPageBody restrictWidth={restrictWidth}>
          <Header iconType={iconType} {...props} />
        </EuiPageBody>
      </EuiPage>
      <EuiPage style={contentStyles}>
        <EuiPageBody restrictWidth={restrictWidth}>
          <Content hasLogoPanel={!!iconType} {...props} />
        </EuiPageBody>
      </EuiPage>
    </Fragment>
  );
}

function overviewContentStyles() {
  const headerGlobalNav = 49;
  const pageTopNav = /* line-height */ 24 + /* padding-top */ 16;
  const header = /* line-height */ 48 + /* padding-top */ 16 + /* padding-bottom */ 32;
  const topBarsTotal = headerGlobalNav + pageTopNav + header;

  return {
    backgroundColor: 'white',
    height: `calc(100vh - ${topBarsTotal}px)`,
  };
}
