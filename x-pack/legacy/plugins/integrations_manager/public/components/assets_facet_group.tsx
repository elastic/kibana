/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiFacetButton,
  EuiFacetGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import styled from 'styled-components';
import { entries } from '../../common/type_utils';
import {
  DisplayedAssets,
  AssetIcons,
  AssetTitleMap,
  ServiceIcons,
  ServiceTitleMap,
} from '../constants';
import {
  AssetsGroupedByServiceByType,
  Assets,
  KibanaAssetType,
  AssetType,
} from '../../common/types';
import { useCore } from '../hooks/use_core';

export function AssetsFacetGroup({ assets }: { assets: AssetsGroupedByServiceByType }) {
  const { theme } = useCore();
  const FirstHeaderRow = styled(EuiFlexGroup)`
    padding: 0 0 ${theme.eui.paddingSizes.m} 0;
  `;

  const HeaderRow = styled(EuiFlexGroup)`
    padding: ${theme.eui.paddingSizes.m} 0;
  `;

  const FacetGroup = styled(EuiFacetGroup)`
    flex-grow: 0;
  `;

  return (
    <Fragment>
      {entries(assets).map(([service, typeToParts], index) => {
        const Header = index === 0 ? FirstHeaderRow : HeaderRow;
        // filter out assets we are not going to display
        const filteredTypes: Assets = entries(typeToParts).reduce((acc: any, [asset, value]) => {
          if (DisplayedAssets[service].includes(asset)) acc[asset] = value;
          return acc;
        }, {});
        return (
          <Fragment key={service}>
            <Header gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiIcon type={ServiceIcons[service]} />
              </EuiFlexItem>

              <EuiFlexItem>
                <EuiTitle key={service} size="xs">
                  <EuiText>
                    <h4>{ServiceTitleMap[service]} Assets</h4>
                  </EuiText>
                </EuiTitle>
              </EuiFlexItem>
            </Header>

            <FacetGroup>
              {entries(filteredTypes).map(([type, parts]) => {
                let iconType = null;
                if (type in AssetIcons) {
                  // only kibana assets have icons
                  iconType = AssetIcons[type as KibanaAssetType];
                }
                const iconNode = iconType ? <EuiIcon type={iconType} size="s" /> : '';
                const FacetButton = styled(EuiFacetButton)`
                  padding: '${theme.eui.paddingSizes.xs} 0';
                  height: 'unset';
                `;

                return (
                  <FacetButton
                    key={type}
                    quantity={parts.length}
                    icon={iconNode}
                    // https://github.com/elastic/eui/issues/2216
                    buttonRef={() => {}}
                  >
                    <EuiTextColor color="subdued">{AssetTitleMap[type]}</EuiTextColor>
                  </FacetButton>
                );
              })}
            </FacetGroup>
          </Fragment>
        );
      })}
    </Fragment>
  );
}
