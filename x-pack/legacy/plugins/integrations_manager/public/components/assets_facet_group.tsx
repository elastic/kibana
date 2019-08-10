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
import { entries } from '../../common/type_utils';
import { AssetIcons, AssetTitleMap, ServiceIcons, ServiceTitleMap } from '../constants';
import { AssetsGroupedByServiceByType } from '../../common/types';

export function AssetsFacetGroup({ assets }: { assets: AssetsGroupedByServiceByType }) {
  return (
    <Fragment>
      {entries(assets).map(([service, typeToParts], index) => {
        return (
          <Fragment key={service}>
            <EuiFlexGroup
              gutterSize="s"
              alignItems="center"
              style={{ padding: index === 0 ? '0 0 1em 0' : '1em 0' }}
            >
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
            </EuiFlexGroup>

            <EuiFacetGroup style={{ flexGrow: 0 }}>
              {entries(typeToParts).map(([type, parts]) => {
                const iconType = AssetIcons[type];
                const iconNode = iconType ? <EuiIcon type={iconType} size="s" /> : '';
                return (
                  <EuiFacetButton
                    key={type}
                    style={{ padding: '4px 0', height: 'unset' }}
                    quantity={parts.length}
                    icon={iconNode}
                    // https://github.com/elastic/eui/issues/2216
                    buttonRef={() => {}}
                  >
                    <EuiTextColor color="subdued">{AssetTitleMap[type]}</EuiTextColor>
                  </EuiFacetButton>
                );
              })}
            </EuiFacetGroup>
          </Fragment>
        );
      })}
    </Fragment>
  );
}
