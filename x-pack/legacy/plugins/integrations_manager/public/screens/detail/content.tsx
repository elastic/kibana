/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiPanel, EuiTitle } from '@elastic/eui';
import styled from 'styled-components';
import { SideNavLinks } from './side_nav_links';
import { IntegrationInfo } from '../../../common/types';
import { AssetAccordion } from '../../components/asset_accordion';
import { AssetsFacetGroup } from '../../components/assets_facet_group';
import { Requirements } from '../../components/requirements';
import { CenterColumn, LeftColumn, RightColumn } from './layout';
import { OverviewPanel } from './overview_panel';
import { useCore } from '../../hooks/use_core';
import { DEFAULT_PANEL, DetailProps } from '.';

type ContentProps = IntegrationInfo & Pick<DetailProps, 'panel'> & { hasIconPanel: boolean };
export function Content(props: ContentProps) {
  const { assets, hasIconPanel, name, panel, requirement, version } = props;
  const { theme } = useCore();
  const isOverviewPanel = panel === 'overview';
  const SideNavColumn = hasIconPanel
    ? styled(LeftColumn)`
        /* 🤢🤷 https://www.styled-components.com/docs/faqs#how-can-i-override-styles-with-higher-specificity */
        &&& {
          margin-top: ${theme.eui.euiKeyPadMenuSize};
        }
      `
    : LeftColumn;

  return (
    <EuiFlexGroup>
      <SideNavColumn>
        <SideNavLinks name={name} version={version} active={panel || DEFAULT_PANEL} />
      </SideNavColumn>
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
