/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { DEFAULT_PANEL, DetailProps } from '.';
import { PackageInfo } from '../../../common/types';
import { AssetsFacetGroup } from '../../components/assets_facet_group';
import { Requirements } from '../../components/requirements';
import { CenterColumn, LeftColumn, RightColumn } from './layout';
import { OverviewPanel } from './overview_panel';
import { SideNavLinks } from './side_nav_links';
import { DataSourcesPanel } from './data_sources_panel';

type ContentProps = PackageInfo & Pick<DetailProps, 'panel'> & { hasIconPanel: boolean };
export function Content(props: ContentProps) {
  const { hasIconPanel, name, panel, version } = props;
  const SideNavColumn = hasIconPanel
    ? styled(LeftColumn)`
        /* 🤢🤷 https://www.styled-components.com/docs/faqs#how-can-i-override-styles-with-higher-specificity */
        &&& {
          margin-top: 77px;
        }
      `
    : LeftColumn;

  // fixes IE11 problem with nested flex items
  const ContentFlexGroup = styled(EuiFlexGroup)`
    flex: 0 0 auto !important;
  `;
  return (
    <ContentFlexGroup>
      <SideNavColumn>
        <SideNavLinks name={name} version={version} active={panel || DEFAULT_PANEL} />
      </SideNavColumn>
      <CenterColumn>
        <ContentPanel {...props} />
      </CenterColumn>
      <RightColumn>
        <RightColumnContent {...props} />
      </RightColumn>
    </ContentFlexGroup>
  );
}

type ContentPanelProps = PackageInfo & Pick<DetailProps, 'panel'>;
export function ContentPanel(props: ContentPanelProps) {
  const { panel, name, version } = props;
  switch (panel) {
    case 'data-sources':
      return <DataSourcesPanel name={name} version={version} />;
    case 'overview':
    default:
      return <OverviewPanel {...props} />;
  }
}

type RightColumnContentProps = PackageInfo & Pick<DetailProps, 'panel'>;
function RightColumnContent(props: RightColumnContentProps) {
  const { assets, requirement, panel } = props;
  switch (panel) {
    case 'overview':
      return (
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
      );
    default:
      return <EuiSpacer />;
  }
}
