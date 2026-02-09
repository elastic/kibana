/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  Streams,
  effectiveToIngestLifecycle,
  isDslLifecycle,
  isInheritLifecycle,
  isRoot,
  type IngestStreamLifecycleDSL,
  type IngestStreamLifecycle,
} from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { useEuiTheme } from '@elastic/eui';
import { useKibana } from '../../../../hooks/use_kibana';
import { useIlmPhasesColorAndDescription } from './use_ilm_phases_color_and_description';
import type { DataStreamStats } from './use_data_stream_stats';
import { formatBytes } from '../helpers/format_bytes';
import { OverrideSettingsModal } from '../downsampling/override_settings_modal/override_settings_modal';
import type { LifecyclePhase } from '../common/data_lifecycle/lifecycle_types';
import { buildLifecyclePhases } from '../common/data_lifecycle/lifecycle_types';

type ModalType = 'overrideSettings' | null;

interface UseDslLifecycleSummaryProps {
  definition: Streams.ingest.all.GetResponse;
  stats?: DataStreamStats;
  refreshDefinition?: () => void;
  updateStreamLifecycle: (lifecycle: IngestStreamLifecycle) => Promise<void>;
}

interface UseDslLifecycleSummaryResult {
  phases: LifecyclePhase[];
  downsampleSteps?: IngestStreamLifecycleDSL['dsl']['downsample'];
  onRemoveDownsampleStep?: (stepNumber: number) => void;
  modals: React.ReactNode;
}

export const useDslLifecycleSummary = ({
  definition,
  stats,
  refreshDefinition,
  updateStreamLifecycle,
}: UseDslLifecycleSummaryProps): UseDslLifecycleSummaryResult => {
  const {
    core: { notifications },
    isServerless,
  } = useKibana();

  const { euiTheme } = useEuiTheme();
  const { ilmPhases } = useIlmPhasesColorAndDescription();

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [dslDownsampleStepToRemove, setDslDownsampleStepToRemove] = useState<number | null>(null);

  const effectiveLifecycle = definition.effective_lifecycle;
  const isDsl = isDslLifecycle(effectiveLifecycle);

  const getPhases = (): LifecyclePhase[] => {
    if (!isDsl) {
      return [];
    }

    const retentionPeriod = effectiveLifecycle.dsl.data_retention;
    const storageSize = stats?.sizeBytes ? formatBytes(stats.sizeBytes) : undefined;

    return buildLifecyclePhases({
      label: isServerless
        ? i18n.translate('xpack.streams.streamDetailLifecycle.successfulIngest', {
            defaultMessage: 'Successful ingest',
          })
        : i18n.translate('xpack.streams.streamDetailLifecycle.hot', {
            defaultMessage: 'Hot',
          }),
      color: isServerless ? euiTheme.colors.severity.success : ilmPhases.hot.color,
      size: storageSize,
      retentionPeriod,
      description: isServerless ? '' : ilmPhases.hot.description,
      sizeInBytes: stats?.sizeBytes,
      docsCount: stats?.totalDocs,
      deletePhaseDescription: ilmPhases.delete.description,
      deletePhaseColor: ilmPhases.delete.color,
    });
  };

  const handleCancelModal = () => {
    setActiveModal(null);
    setDslDownsampleStepToRemove(null);
  };

  const removeDslDownsampleStep = async (stepNumber: number) => {
    if (!isDslLifecycle(definition.effective_lifecycle)) {
      return;
    }

    try {
      const ingestLifecycle = effectiveToIngestLifecycle(definition.effective_lifecycle);
      if (!('dsl' in ingestLifecycle)) {
        return;
      }

      const downsampleSteps = ingestLifecycle.dsl.downsample ?? [];
      if (stepNumber < 1 || downsampleSteps.length === 0) {
        return;
      }

      const updatedDownsample = downsampleSteps.filter((_step, index) => index !== stepNumber - 1);

      const nextLifecycle: IngestStreamLifecycle = {
        dsl: {
          ...ingestLifecycle.dsl,
          downsample: updatedDownsample,
        },
      };

      await updateStreamLifecycle(nextLifecycle);

      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.streams.lifecycleSummary.downsampleStepRemoved', {
          defaultMessage: 'Downsampling step removed',
        }),
      });

      await Promise.resolve(refreshDefinition?.());
      handleCancelModal();
    } catch (error) {
      notifications.toasts.addError(error as Error, {
        title: i18n.translate('xpack.streams.lifecycleSummary.downsampleStepRemoveFailed', {
          defaultMessage: 'Failed to remove downsampling step',
        }),
      });
    }
  };

  const handleRemoveDslDownsampleStep = (stepNumber: number) => {
    if (!isDslLifecycle(definition.effective_lifecycle)) {
      return;
    }
    const ingestLifecycle = definition.stream.ingest?.lifecycle;
    const isLifecycleInherited = ingestLifecycle ? isInheritLifecycle(ingestLifecycle) : false;
    const isWiredStream = Streams.WiredStream.GetResponse.is(definition);
    const isRootStream = isRoot(definition.stream.name);
    const inheritsFromIndexTemplate = isLifecycleInherited && (!isWiredStream || isRootStream);

    if (inheritsFromIndexTemplate) {
      setDslDownsampleStepToRemove(stepNumber);
      setActiveModal('overrideSettings');
      return;
    }

    removeDslDownsampleStep(stepNumber);
  };

  const handleConfirmOverrideSettings = () => {
    if (dslDownsampleStepToRemove === null) {
      return;
    }

    removeDslDownsampleStep(dslDownsampleStepToRemove);
  };

  const modals = isDsl ? (
    <>
      {activeModal === 'overrideSettings' && (
        <OverrideSettingsModal
          onCancel={handleCancelModal}
          onSave={handleConfirmOverrideSettings}
        />
      )}
    </>
  ) : null;

  const downsampleSteps = isDsl ? effectiveLifecycle.dsl.downsample : undefined;
  return {
    phases: getPhases(),
    downsampleSteps,
    onRemoveDownsampleStep: isDsl ? handleRemoveDslDownsampleStep : undefined,
    modals,
  };
};
