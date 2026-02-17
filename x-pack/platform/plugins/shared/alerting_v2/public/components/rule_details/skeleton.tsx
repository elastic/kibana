/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeader,
  EuiPanel,
  EuiSkeletonRectangle,
  EuiSkeletonText,
  EuiSkeletonTitle,
  EuiSpacer,
} from '@elastic/eui';

export const Skeleton: React.FunctionComponent = () => {
  return (
    <>
      <EuiPageHeader
        data-test-subj="ruleDetailsTitle"
        bottomBorder
        pageTitle={<EuiSkeletonTitle size="l" />}
        description={
          <EuiFlexGroup
            alignItems="center"
            justifyContent="flexStart"
            gutterSize="m"
            wrap={false}
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiSkeletonRectangle width={72} height={24} borderRadius="m" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiSkeletonRectangle width={32} height={16} borderRadius="s" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiSkeletonRectangle width={48} height={24} borderRadius="m" />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiSkeletonRectangle width={36} height={16} borderRadius="s" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiSkeletonRectangle width={64} height={24} borderRadius="m" />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      />

      <EuiSpacer size="m" />
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem grow={2}>
          <EuiPanel color="subdued" hasBorder={false} paddingSize="m">
            <EuiSkeletonTitle size="s" />
            <EuiSpacer size="m" />
            <EuiSkeletonText lines={4} />

            <EuiSpacer size="m" />
            <EuiSkeletonTitle size="xs" />
            <EuiSpacer size="s" />
            <EuiPanel hasBorder paddingSize="m" css={{ width: '100%' }}>
              <EuiSkeletonText lines={8} />
            </EuiPanel>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiPanel hasBorder paddingSize="m">
            <EuiSkeletonTitle size="s" />
            <EuiSpacer size="m" />
            <EuiSkeletonText lines={3} />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />
    </>
  );
};
