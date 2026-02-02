/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { LifecyclePhase } from './lifecycle_types';
import type { TimelineSegment } from './data_lifecycle_segments';

export const DataLifecycleTimeline = ({
  phases,
  isRetentionInfinite,
  timelineSegments,
  gridTemplateColumns,
}: {
  phases: LifecyclePhase[];
  isRetentionInfinite: boolean;
  timelineSegments?: TimelineSegment[];
  gridTemplateColumns: string;
}) => {
  const { euiTheme } = useEuiTheme();
  const segments: TimelineSegment[] =
    timelineSegments ??
    phases.map((phase) => ({
      grow: phase.grow,
      leftValue: phase.min_age,
      isDelete: phase.isDelete,
    }));

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder={false}
      paddingSize="xs"
      css={{
        borderRadius: euiTheme.border.radius.small,
      }}
    >
      <EuiFlexGroup direction="column" gutterSize="none">
        {/* Timeline points and labels */}
        <EuiFlexGrid
          columns={1}
          gutterSize="none"
          responsive={false}
          css={{
            gridTemplateColumns,
            paddingInline: euiTheme.size.xxs,
            boxSizing: 'border-box',
          }}
        >
          {segments.map((segment, index) => {
            const isFirstPhase = index === 0;
            const isLastPhase = index === segments.length - 1;
            const showInfinite = isRetentionInfinite && isLastPhase;

            return (
              <EuiFlexItem key={index} grow={segment.grow} css={{ flexBasis: 0, minWidth: 0 }}>
                <DataLifecyclePhaseTimeline
                  phase={segment}
                  leftValue={segment.leftValue}
                  showInfinite={showInfinite}
                  isFirstPhase={isFirstPhase}
                />
              </EuiFlexItem>
            );
          })}
        </EuiFlexGrid>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const DataLifecyclePhaseTimeline = ({
  phase,
  leftValue,
  showInfinite,
  isFirstPhase,
}: {
  phase: TimelineSegment;
  leftValue?: string;
  showInfinite?: boolean;
  isFirstPhase?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const isDeletePhase = phase.isDelete;

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiPanel
        paddingSize="s"
        borderRadius="none"
        hasBorder={false}
        hasShadow={false}
        grow={false}
        style={{
          paddingBottom: '5px',
          // Show vertical line on the left for the first phase
          ...(isFirstPhase && {
            borderLeft: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
          }),
          // Show vertical line on the right for all phases except delete phase
          ...(!isDeletePhase && {
            borderRight: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
          }),
        }}
      />
      <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
        {leftValue && (
          <EuiPanel
            paddingSize="xs"
            grow={false}
            hasBorder={false}
            hasShadow={false}
            css={{ transform: 'translateX(-50%)' }}
            data-test-subj={`dataLifecycleTimeline-value-${leftValue}`}
          >
            <EuiText textAlign="center" size="xs" color="subdued">
              {leftValue}
            </EuiText>
          </EuiPanel>
        )}
        {/* Show infinity symbol at the right for infinite retention */}
        {showInfinite && (
          <EuiPanel
            paddingSize="xs"
            grow={false}
            hasBorder={false}
            hasShadow={false}
            css={{ transform: 'translateX(50%)' }}
            data-test-subj="dataLifecycleTimeline-infinite"
          >
            <EuiText textAlign="center" size="xs" color="subdued">
              ∞
            </EuiText>
          </EuiPanel>
        )}
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
