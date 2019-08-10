/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState, useEffect } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPage,
  EuiPageBody,
  EuiPageWidthProps,
  EuiPanel,
  ICON_TYPES,
} from '@elastic/eui';

import { PLUGIN } from '../../../common/constants';
import { IntegrationInfo } from '../../../common/types';
import { DetailViewPanelName } from '../../';
import { Requirements } from '../../components/requirements';
import { AssetAccordion } from '../../components/asset_accordion';
import { AssetsFacetGroup } from '../../components/assets_facet_group';
import { getIntegrationInfoByKey } from '../../data';
import { useBreadcrumbs, useLinks } from '../../hooks';
import { Header } from './header';
import { CenterColumn, LeftColumn, RightColumn } from './layout';
import { OverviewPanel } from './overview_panel';
import { SideNavLinks } from './side_nav_links';

export const ICON_HEIGHT_PANEL = 164;
export const ICON_HEIGHT_NATURAL = 32;
const DEFAULT_PANEL: DetailViewPanelName = 'overview';

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
  const { name, restrictWidth, title, panel } = props;
  const { toListView } = useLinks();
  const iconType = ICON_TYPES.find(key => key.toLowerCase() === `logo${name}`);
  const styles = panel === 'overview' ? overviewContentStyles() : {};

  useBreadcrumbs([{ text: PLUGIN.TITLE, href: toListView() }, { text: title }]);

  return (
    <Fragment>
      <EuiPage restrictWidth={restrictWidth} style={{ padding: '16px 16px 0 0' }}>
        <NavButtonBack />
      </EuiPage>
      <EuiPage style={{ borderBottom: '1px solid #D3DAE6', paddingBottom: '32px' }}>
        <EuiPageBody restrictWidth={restrictWidth}>
          <Header iconType={iconType} {...props} />
        </EuiPageBody>
      </EuiPage>
      <EuiPage style={styles}>
        <EuiPageBody restrictWidth={restrictWidth}>
          <Content hasLogoPanel={!!iconType} {...props} />
        </EuiPageBody>
      </EuiPage>
    </Fragment>
  );
}

type ContentPanelProps = IntegrationInfo & Pick<DetailProps, 'panel'>;
function ContentPanel(props: ContentPanelProps) {
  const { assets, panel } = props;
  switch (panel) {
    case 'assets':
      return <AssetAccordion assets={assets} />;
    case 'data-sources':
      return <EuiPanel />;
    case 'overview':
    default:
      return <OverviewPanel {...props} />;
  }
}

type ContentProps = IntegrationInfo & Pick<DetailProps, 'panel'> & { hasLogoPanel: boolean };
export function Content(props: ContentProps) {
  const { assets, hasLogoPanel, name, panel, requirement, version } = props;
  const marginTop = ICON_HEIGHT_PANEL / 2 + ICON_HEIGHT_NATURAL / 2;
  const leftStyles = hasLogoPanel ? { marginTop: `${marginTop}px` } : {};
  const isOverviewPanel = panel === 'overview';

  return (
    <EuiFlexGroup>
      <LeftColumn style={leftStyles}>
        <SideNavLinks name={name} version={version} active={panel || DEFAULT_PANEL} />
      </LeftColumn>
      <CenterColumn>
        <ContentPanel {...props} />
      </CenterColumn>
      <RightColumn>
        {isOverviewPanel && (
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem grow={false}>
              <Requirements requirements={requirement} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiHorizontalRule margin="xl" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <AssetsFacetGroup assets={assets} />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </RightColumn>
    </EuiFlexGroup>
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
