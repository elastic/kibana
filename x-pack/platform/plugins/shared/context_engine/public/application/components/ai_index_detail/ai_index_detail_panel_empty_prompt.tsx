/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiEmptyPromptProps, IconType } from '@elastic/eui';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSkeletonCircle,
  EuiSkeletonText,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { type ReactNode } from 'react';

interface AiIndexDetailPanelEmptyStateProps {
  iconType: IconType;
  dataTestSubj: string;
  message: ReactNode;
  action?: ReactNode;
  paddingSize?: EuiEmptyPromptProps['paddingSize'];
}

export const AiIndexDetailPanelEmptyState = ({
  iconType,
  dataTestSubj,
  message,
  action,
  paddingSize,
}: AiIndexDetailPanelEmptyStateProps) => {
  return (
    <EuiEmptyPrompt
      paddingSize={paddingSize ?? 'none'}
      data-test-subj={dataTestSubj}
      icon={<EuiIcon type={iconType} size="l" aria-hidden={true} color="subdued" />}
      body={
        action != null ? (
          <EuiFlexGroup direction="column" alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued" textAlign="center">
                {message}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{action}</EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiText size="xs" color="subdued">
            {message}
          </EuiText>
        )
      }
    />
  );
};

// Without a width, the centered prompt shrinks the empty skeleton line to nothing.
const skeletonMessageStyle = css({ width: 240 });
const skeletonIconStyle = css({ margin: '0 auto' });

/** Loading version of the empty state, with the same size. */
export const AiIndexDetailPanelEmptyStateSkeleton = ({
  dataTestSubj,
}: {
  dataTestSubj: string;
}) => (
  <EuiEmptyPrompt
    paddingSize="none"
    data-test-subj={dataTestSubj}
    // `s` is 24px, the size of the `l` icon in the empty state.
    icon={<EuiSkeletonCircle size="s" css={skeletonIconStyle} />}
    body={
      <div css={skeletonMessageStyle}>
        <EuiSkeletonText lines={1} size="xs" />
      </div>
    }
  />
);
