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
  EuiSkeletonCircle,
  EuiSkeletonRectangle,
  EuiSkeletonText,
  EuiSkeletonTitle,
} from '@elastic/eui';

export interface AlertEpisodeDescriptionListSkeletonProps {
  rows?: number;
  /** Announces what loads when the skeleton stands in for a whole panel. */
  'aria-label'?: string;
  'data-test-subj'?: string;
}

/**
 * Loading placeholder shaped like the two-column description list used by the overview sections.
 */
export const AlertEpisodeDescriptionListSkeleton = ({
  rows = 5,
  'aria-label': ariaLabel,
  'data-test-subj': dataTestSubj,
}: AlertEpisodeDescriptionListSkeletonProps) => (
  <EuiFlexGroup
    direction="column"
    gutterSize="m"
    responsive={false}
    role={ariaLabel ? 'progressbar' : undefined}
    aria-label={ariaLabel}
    data-test-subj={dataTestSubj}
  >
    {Array.from({ length: rows }, (_, index) => (
      <EuiFlexGroup key={index} gutterSize="m" responsive={false} alignItems="center">
        <EuiFlexItem grow={1}>
          <EuiSkeletonText lines={1} size="s" />
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <EuiSkeletonText lines={1} size="s" />
        </EuiFlexItem>
      </EuiFlexGroup>
    ))}
  </EuiFlexGroup>
);

export interface AlertEpisodeCardListSkeletonProps {
  rows?: number;
  cardHeight?: number;
  'data-test-subj'?: string;
}

/**
 * Loading placeholder shaped like a stack of episode cards (e.g. the related episodes lists).
 */
export const AlertEpisodeCardListSkeleton = ({
  rows = 3,
  cardHeight = 64,
  'data-test-subj': dataTestSubj,
}: AlertEpisodeCardListSkeletonProps) => (
  <EuiFlexGroup direction="column" gutterSize="s" responsive={false} data-test-subj={dataTestSubj}>
    {Array.from({ length: rows }, (_, index) => (
      <EuiFlexItem key={index} grow={false}>
        <EuiSkeletonRectangle width="100%" height={cardHeight} borderRadius="m" />
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);

export interface AlertEpisodeTimelineSkeletonProps {
  rows?: number;
  'data-test-subj'?: string;
}

/**
 * Loading placeholder shaped like the episode timeline's comment list.
 */
export const AlertEpisodeTimelineSkeleton = ({
  rows = 3,
  'data-test-subj': dataTestSubj,
}: AlertEpisodeTimelineSkeletonProps) => (
  <EuiFlexGroup direction="column" gutterSize="l" responsive={false} data-test-subj={dataTestSubj}>
    {Array.from({ length: rows }, (_, index) => (
      <EuiFlexGroup key={index} gutterSize="m" responsive={false} alignItems="flexStart">
        <EuiFlexItem grow={false}>
          <EuiSkeletonCircle size="m" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSkeletonText lines={2} size="s" />
        </EuiFlexItem>
      </EuiFlexGroup>
    ))}
  </EuiFlexGroup>
);

/**
 * Loading placeholder for the alert details flyout title, shared by the Universal and Classic
 * details so both load the same way.
 */
export const AlertDetailsTitleSkeleton = () => (
  <EuiSkeletonTitle size="xs" data-test-subj="alertDetailsTitleSkeleton" />
);

export interface AlertDetailsValueSkeletonProps {
  width?: number;
  height?: number;
}

/**
 * Loading placeholder for a one-line value in the alert details flyout header, such as an info
 * block, a badge or the description. It holds the value's space so the header keeps its height.
 */
export const AlertDetailsValueSkeleton = ({
  width = 80,
  height = 16,
}: AlertDetailsValueSkeletonProps) => (
  <EuiSkeletonRectangle
    width={width}
    height={height}
    borderRadius="s"
    data-test-subj="alertDetailsValueSkeleton"
  />
);
