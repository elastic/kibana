/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiPanel, EuiTitle } from '@elastic/eui';
import { IntegrationInfo } from '../../../common/types';
import { AssetAccordion } from '../../components/asset_accordion';
import { AssetsFacetGroup } from '../../components/assets_facet_group';
import { Requirements } from '../../components/requirements';
import { CenterColumn, LeftColumn, RightColumn } from './layout';
import { OverviewPanel } from './overview_panel';
import { SideNavLinks } from './side_nav_links';
import { ICON_HEIGHT_PANEL, ICON_HEIGHT_NATURAL, DEFAULT_PANEL, DetailProps } from './index';

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

type ContentPanelProps = IntegrationInfo & Pick<DetailProps, 'panel'>;
export function ContentPanel(props: ContentPanelProps) {
  const { assets, panel } = props;
  switch (panel) {
    case 'assets':
      return <AssetAccordion assets={assets} />;
    case 'data-sources':
      return (
        <EuiPanel>
          <EuiTitle size="xs">
            <span>Data Sources</span>
          </EuiTitle>
        </EuiPanel>
      );
    case 'overview':
    default:
      return <OverviewPanel {...props} />;
  }
}
