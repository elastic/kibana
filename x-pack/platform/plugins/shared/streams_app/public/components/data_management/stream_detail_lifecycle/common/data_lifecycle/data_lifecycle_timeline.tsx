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
import type { PhaseName } from '@kbn/streams-schema';
import type { LifecyclePhase } from './lifecycle_types';
import type { TimelineSegment } from './data_lifecycle_segments';

export const DataLifecycleTimeline = ({
  phases,
  isRetentionInfinite,
  timelineSegments,
  gridTemplateColumns,
  invalidPhases,
  invalidStepIndices,
}: {
  phases: LifecyclePhase[];
  isRetentionInfinite: boolean;
  timelineSegments?: TimelineSegment[];
  gridTemplateColumns: string;
  invalidPhases?: PhaseName[];
  invalidStepIndices?: number[];
}) => {
  const { euiTheme } = useEuiTheme();
  const segments: TimelineSegment[] =
    timelineSegments ??
    phases.map((phase) => ({
      grow: phase.grow,
      leftValue: phase.min_age,
      isDelete: phase.isDelete,
    }));

  const invalidLeftValuesSet = (() => {
    if (
      (!invalidPhases || invalidPhases.length === 0) &&
      (!invalidStepIndices || invalidStepIndices.length === 0)
    ) {
      return new Set<string>();
    }

    const invalidPhasesSet = new Set<string>(invalidPhases ?? []);
    const invalidStepIndicesSet = new Set(invalidStepIndices ?? []);
    const leftValuesSet = new Set<string>();

    if (invalidPhasesSet.has('hot')) {
      const first = segments[0]?.leftValue;
      if (first) leftValuesSet.add(first);
    }

    for (const phase of phases) {
      const phaseName = phase.name;
      if (phaseName === 'hot') continue;
      if (!invalidPhasesSet.has(phaseName)) continue;
      if (phase.min_age) leftValuesSet.add(phase.min_age);
    }

    if (invalidStepIndicesSet.size > 0) {
      for (const segment of segments) {
        if (segment.stepIndex === undefined) continue;
        if (!invalidStepIndicesSet.has(segment.stepIndex)) continue;
        if (segment.leftValue) leftValuesSet.add(segment.leftValue);
      }
    }

    return leftValuesSet;
  })();

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
                  isInvalidPoint={Boolean(
                    segment.leftValue && invalidLeftValuesSet.has(segment.leftValue)
                  )}
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
  isInvalidPoint,
}: {
  phase: TimelineSegment;
  leftValue?: string;
  showInfinite?: boolean;
  isFirstPhase?: boolean;
  isInvalidPoint?: boolean;
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
            data-is-invalid={isInvalidPoint ? 'true' : undefined}
          >
            <EuiText textAlign="center" size="xs" color={isInvalidPoint ? 'danger' : 'subdued'}>
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
