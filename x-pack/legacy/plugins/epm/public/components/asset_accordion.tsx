/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiNotificationBadge,
  EuiText,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';
import styled from 'styled-components';
import { entries } from '../../common/type_utils';
import { AssetsGroupedByServiceByType, KibanaAssetType } from '../../common/types';
import { AssetIcons, AssetTitleMap, ServiceIcons, ServiceTitleMap } from '../constants';
import { useCore } from '../hooks/use_core';

export function AssetAccordion({ assets }: { assets: AssetsGroupedByServiceByType }) {
  const { theme } = useCore();

  const FlexGroup = styled(EuiFlexGroup)`
    margin: ${theme.eui.ruleMargins.marginSmall};
  `;

  return (
    <Fragment>
      {entries(assets).map(([service, typeToParts], assetIndex) => {
        return (
          <Fragment key={service}>
            <FlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiIcon type={ServiceIcons[service]} />
              </EuiFlexItem>

              <EuiFlexItem>
                <EuiTitle key={service}>
                  <EuiText>
                    <h4>{ServiceTitleMap[service]} Assets</h4>
                  </EuiText>
                </EuiTitle>
              </EuiFlexItem>
            </FlexGroup>
            <EuiHorizontalRule margin="none" />

            {entries(typeToParts).map(([type, parts], typeIndex, typeEntries) => {
              let iconType = null;
              if (type in AssetIcons) {
                // only kibana assets have icons
                iconType = AssetIcons[type as KibanaAssetType];
              }
              // @types/styled-components@3 does yet support `defaultProps`, which EuiAccordion uses
              // Ref: https://github.com/DefinitelyTyped/DefinitelyTyped/pull/31903
              // we're a major version behind; nearly 2
              return (
                <Fragment key={type}>
                  <EuiAccordion
                    style={{ margin: theme.eui.euiFormControlPadding }}
                    id={type}
                    buttonContent={
                      <EuiFlexGroup gutterSize="s" alignItems="center">
                        <EuiFlexItem grow={false}>
                          {iconType ? <EuiIcon type={iconType} size="s" /> : ''}
                        </EuiFlexItem>

                        <EuiFlexItem>
                          <EuiText color="secondary">{AssetTitleMap[type]}</EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    }
                    paddingSize="m"
                    extraAction={
                      <EuiNotificationBadge color="subdued" size="m">
                        {parts.length}
                      </EuiNotificationBadge>
                    }
                  >
                    <EuiText>
                      <span role="img" aria-label="woman shrugging">
                        🤷
                      </span>
                    </EuiText>
                  </EuiAccordion>
                  {typeIndex < typeEntries.length - 1 ? <EuiHorizontalRule margin="none" /> : ''}
                </Fragment>
              );
            })}
            <EuiSpacer size="l" />
          </Fragment>
        );
      })}
    </Fragment>
  );
}
