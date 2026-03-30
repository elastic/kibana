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

      <EuiSpacer size="l" />

      <EuiFlexGroup gutterSize="l">
        <EuiFlexItem grow={7}>
          {/* Tab bar skeleton */}
          <EuiFlexGroup gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiSkeletonRectangle width={80} height={32} borderRadius="s" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSkeletonRectangle width={80} height={32} borderRadius="s" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSkeletonRectangle width={80} height={32} borderRadius="s" />
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="l" />

          {/* KPI cards skeleton */}
          <EuiFlexGroup gutterSize="l">
            {[1, 2, 3, 4].map((n) => (
              <EuiFlexItem key={n}>
                <EuiPanel hasBorder paddingSize="s">
                  <EuiSkeletonRectangle width="100%" height={80} borderRadius="s" />
                </EuiPanel>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={3}>
          {/* Rule conditions skeleton */}
          <EuiPanel color="subdued" hasBorder={false} paddingSize="m">
            <EuiSkeletonTitle size="s" />
            <EuiSpacer size="m" />
            <EuiSkeletonText lines={4} />
          </EuiPanel>

          <EuiSpacer size="l" />

          {/* Metadata skeleton */}
          <EuiPanel color="subdued" hasBorder={false} paddingSize="m">
            <EuiSkeletonTitle size="s" />
            <EuiSpacer size="s" />
            <EuiSkeletonText lines={4} />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
