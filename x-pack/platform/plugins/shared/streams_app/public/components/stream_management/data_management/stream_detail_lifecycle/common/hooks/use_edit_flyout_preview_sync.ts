/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { DownsampleStep } from '@kbn/streams-schema/src/models/ingest/lifecycle';
import type { LifecyclePhase } from '../data_lifecycle/lifecycle_types';
import { useLifecyclePreview } from './lifecycle_preview';

export interface UseEditFlyoutPreviewSyncArgs {
  isFlyoutOpen: boolean;
  isExternalFlyoutOpen: boolean;
  phases: LifecyclePhase[];
  downsampleSteps?: DownsampleStep[] | null;
  isMetricsStream: boolean;
  hasUnsavedChangesInFlyout?: boolean;
  onDataPhaseFlyoutOpenChange?: (isOpen: boolean) => void;
  includeDownsampleStepsInTimeline?: boolean;
  countDownsampleFromPhases?: boolean;
}

export const useEditFlyoutPreviewSync = ({
  isFlyoutOpen,
  isExternalFlyoutOpen,
  phases,
  downsampleSteps = null,
  isMetricsStream,
  hasUnsavedChangesInFlyout,
  onDataPhaseFlyoutOpenChange,
  includeDownsampleStepsInTimeline = false,
  countDownsampleFromPhases = true,
}: UseEditFlyoutPreviewSyncArgs): void => {
  const {
    clearPreview,
    setDataPhasesCount,
    setDownsampleStepsCount,
    setHasUnsavedChanges,
    setIsActive,
    setRetentionPeriod,
    setTimelineModel,
  } = useLifecyclePreview();

  useEffect(() => {
    onDataPhaseFlyoutOpenChange?.(isFlyoutOpen);
    // Only emit a closing signal on unmount when the flyout was actually open;
    // otherwise toggling `isFlyoutOpen` to `false` would emit `false` twice
    // (once from this cleanup, once from the next effect run).
    return () => {
      if (isFlyoutOpen) {
        onDataPhaseFlyoutOpenChange?.(false);
      }
    };
  }, [isFlyoutOpen, onDataPhaseFlyoutOpenChange]);

  useEffect(() => {
    if (!isFlyoutOpen) {
      if (!isExternalFlyoutOpen) {
        clearPreview();
      }
      return;
    }

    setIsActive(true);
    if (hasUnsavedChangesInFlyout !== undefined) {
      setHasUnsavedChanges(hasUnsavedChangesInFlyout);
    } else {
      setHasUnsavedChanges(false);
    }
  }, [
    clearPreview,
    hasUnsavedChangesInFlyout,
    isExternalFlyoutOpen,
    isFlyoutOpen,
    setHasUnsavedChanges,
    setIsActive,
  ]);

  useEffect(() => {
    if (!isFlyoutOpen) {
      return;
    }

    const retentionPeriod = phases.find((phase) => Boolean(phase.isDelete))?.min_age ?? null;

    setTimelineModel({
      phases,
      downsampleSteps: includeDownsampleStepsInTimeline ? downsampleSteps ?? null : null,
    });
    setRetentionPeriod(retentionPeriod);
    setDataPhasesCount(phases.length);
  }, [
    downsampleSteps,
    includeDownsampleStepsInTimeline,
    isFlyoutOpen,
    phases,
    setDataPhasesCount,
    setRetentionPeriod,
    setTimelineModel,
  ]);

  useEffect(() => {
    if (!isFlyoutOpen) {
      return;
    }

    if (!isMetricsStream) {
      setDownsampleStepsCount(null);
      return;
    }

    const downsampleCount = countDownsampleFromPhases
      ? phases.filter((phase) => Boolean(phase.downsample)).length
      : downsampleSteps?.length ?? 0;

    setDownsampleStepsCount(downsampleCount);
  }, [
    countDownsampleFromPhases,
    downsampleSteps,
    isFlyoutOpen,
    isMetricsStream,
    phases,
    setDownsampleStepsCount,
  ]);
};
