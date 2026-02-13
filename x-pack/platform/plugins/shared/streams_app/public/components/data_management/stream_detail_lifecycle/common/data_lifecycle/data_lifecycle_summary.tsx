/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiPanel,
  EuiSkeletonRectangle,
  EuiSpacer,
  EuiText,
  EuiFlexItem,
} from '@elastic/eui';
import type { DownsampleStep } from '@kbn/streams-schema/src/models/ingest/lifecycle';
import { DataLifecycleTimeline } from './data_lifecycle_timeline';
import {
  buildDslSegments,
  buildPhaseTimelineSegments,
  getGridTemplateColumns,
  getPhaseColumnSpans,
  buildDownsamplingSegments,
} from './data_lifecycle_segments';
import { LifecycleBar } from './lifecycle_bar';
import { DownsamplingBar } from './downsampling_bar';
import { type LifecyclePhase } from './lifecycle_types';

interface DataLifecycleSummaryProps {
  phases: LifecyclePhase[];
  loading?: boolean;
  onPhaseClick?: (phase: LifecyclePhase, index: number) => void;
  downsampleSteps?: DownsampleStep[];
  testSubjPrefix?: string;
  isIlm?: boolean;
  onRemovePhase?: (phaseName: string) => void;
  onRemoveDownsampleStep?: (stepNumber: number) => void;
  canManageLifecycle: boolean;
}

export const DataLifecycleSummary = ({
  phases,
  loading = false,
  onPhaseClick,
  downsampleSteps,
  testSubjPrefix,
  isIlm,
  onRemovePhase,
  onRemoveDownsampleStep,
  canManageLifecycle,
}: DataLifecycleSummaryProps) => {
  const isRetentionInfinite = !phases.some((p) => p.isDelete);
  const showSkeleton = loading && phases.length === 0;

  const hasDslDownsampling = Boolean(downsampleSteps?.length);
  const dslSegments =
    hasDslDownsampling && downsampleSteps ? buildDslSegments(phases, downsampleSteps) : null;
  const timelineSegments = dslSegments?.timelineSegments ?? buildPhaseTimelineSegments(phases);
  const downsamplingSegments = buildDownsamplingSegments(phases, dslSegments);
  const gridTemplateColumns = getGridTemplateColumns(timelineSegments);
  const phaseColumnSpans = getPhaseColumnSpans(phases, timelineSegments);

  return (
    <EuiPanel hasShadow={false} hasBorder grow paddingSize="s">
      <EuiFlexGroup
        direction="column"
        gutterSize="s"
        justifyContent="spaceBetween"
        css={{ height: '100%' }}
      >
        <EuiPanel hasShadow={false} hasBorder={false} paddingSize="s" grow={false}>
          <EuiText>
            <h5 data-test-subj="dataLifecycleSummary-title">
              {i18n.translate('xpack.streams.streamDetailLifecycle.dataLifecycle', {
                defaultMessage: 'Data lifecycle',
              })}
            </h5>
          </EuiText>
        </EuiPanel>

        <EuiPanel grow hasShadow={false} hasBorder={false} paddingSize="s">
          <EuiFlexGroup direction="column" justifyContent="center" css={{ height: '100%' }}>
            {showSkeleton ? (
              <EuiSkeletonRectangle
                width="100%"
                height={50}
                borderRadius="s"
                css={{ marginBottom: 35 }}
                data-test-subj="dataLifecycleSummary-skeleton"
              />
            ) : (
              <EuiFlexItem grow={false}>
                <LifecycleBar
                  phases={phases}
                  gridTemplateColumns={gridTemplateColumns}
                  phaseColumnSpans={phaseColumnSpans}
                  onPhaseClick={onPhaseClick}
                  testSubjPrefix={testSubjPrefix}
                  isIlm={isIlm}
                  onRemovePhase={onRemovePhase}
                  canManageLifecycle={canManageLifecycle}
                />
                <DownsamplingBar
                  segments={downsamplingSegments}
                  gridTemplateColumns={gridTemplateColumns}
                  onRemoveStep={onRemoveDownsampleStep}
                  canManageLifecycle={canManageLifecycle}
                />
                <EuiSpacer size="xs" />
                <DataLifecycleTimeline
                  phases={phases}
                  isRetentionInfinite={isRetentionInfinite}
                  timelineSegments={timelineSegments}
                  gridTemplateColumns={gridTemplateColumns}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
