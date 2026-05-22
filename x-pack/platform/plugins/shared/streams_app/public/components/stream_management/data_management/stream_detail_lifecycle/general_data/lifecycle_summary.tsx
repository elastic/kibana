/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import type { Streams, IngestStreamLifecycleILM } from '@kbn/streams-schema';
import {
  Streams as StreamsSchema,
  isDslLifecycle,
  isIlmLifecycle,
  isInheritLifecycle,
  isRoot,
} from '@kbn/streams-schema';
import type { PhaseName } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { EuiBadge, EuiButton, EuiCallOut, EuiSpacer, EuiToolTip } from '@elastic/eui';
import type { DataStreamStats } from '../hooks/use_data_stream_stats';
import { DataLifecycleSummary } from '../common/data_lifecycle/data_lifecycle_summary';
import { useUpdateStreamLifecycle } from '../hooks/use_update_stream_lifecycle';
import { useIlmLifecycleSummary } from '../hooks/use_ilm_lifecycle_summary';
import { useDslLifecycleSummary } from '../hooks/use_dsl_lifecycle_summary';
import { MAX_DOWNSAMPLE_STEPS } from '../data_phases/edit_dsl_steps_flyout/form';
import { useLifecyclePreview } from '../common/hooks/lifecycle_preview';
import type {
  IlmPhaseSelectOption,
  IlmPhaseSelectRenderButtonProps,
} from '../data_phases/ilm_phase_select/ilm_phase_select';
import { IlmPhaseSelect } from '../data_phases/ilm_phase_select/ilm_phase_select';

const addPhaseButtonLabel = i18n.translate(
  'xpack.streams.dataLifecycleSummary.addPhaseButtonLabel',
  {
    defaultMessage: 'Add data phase',
  }
);

const allPhasesInUseTooltip = i18n.translate(
  'xpack.streams.dataLifecycleSummary.allPhasesInUseTooltip',
  { defaultMessage: 'All data phases are in use' }
);

const addPhaseAndDownsamplingButtonLabel = i18n.translate(
  'xpack.streams.dataLifecycleSummary.addPhaseAndDownsamplingButtonLabel',
  {
    defaultMessage: 'Add data phase and downsampling',
  }
);

const addDownsampleStepButtonLabel = i18n.translate(
  'xpack.streams.dataLifecycleSummary.addDownsampleStepButtonLabel',
  {
    defaultMessage: 'Add downsample step',
  }
);

const maxDownsampleStepsTooltip = i18n.translate(
  'xpack.streams.dataLifecycleSummary.maxDownsampleStepsTooltip',
  {
    defaultMessage: 'Maximum of {max} downsampling steps',
    values: { max: MAX_DOWNSAMPLE_STEPS },
  }
);

const renderAddPhaseButton = (label: string) => (buttonProps: IlmPhaseSelectRenderButtonProps) => {
  const button = (
    <EuiButton {...buttonProps} color="text" size="s" iconType="chevronSingleDown" iconSide="right">
      {label}
    </EuiButton>
  );

  if (!buttonProps.disabled) return button;

  return (
    <EuiToolTip position="top" content={allPhasesInUseTooltip}>
      {button}
    </EuiToolTip>
  );
};

interface LifecycleSummaryProps {
  definition: Streams.ingest.all.GetResponse;
  isMetricsStream: boolean;
  stats?: DataStreamStats;
  refreshDefinition?: () => void;
}

const dataStreamLifecycleTitle = i18n.translate('xpack.streams.dataLifecycleSummary.title.dlm', {
  defaultMessage: 'Data stream lifecycle',
});

const getIlmTitle = (policyName: string) =>
  i18n.translate('xpack.streams.dataLifecycleSummary.title.ilm', {
    defaultMessage: 'ILM: {policyName}',
    values: { policyName },
  });

const inheritedBadgeLabel = i18n.translate('xpack.streams.dataLifecycleSummary.inheritedBadge', {
  defaultMessage: 'Inherited',
});

const shouldShowLifecycleInheritedBadge = (definition: Streams.ingest.all.GetResponse): boolean => {
  const isClassicStream = StreamsSchema.ClassicStream.GetResponse.is(definition);
  const isWiredStream = StreamsSchema.WiredStream.GetResponse.is(definition);
  const isInheritingFromIndexTemplate =
    isClassicStream && isInheritLifecycle(definition.stream.ingest.lifecycle);
  const isInheritingFromParent =
    isWiredStream &&
    !isRoot(definition.stream.name) &&
    isInheritLifecycle(definition.stream.ingest.lifecycle);
  return isInheritingFromIndexTemplate || isInheritingFromParent;
};

const IlmLifecycleSummary = ({
  definition,
  isMetricsStream,
  stats,
  refreshDefinition,
}: LifecycleSummaryProps) => {
  const {
    isActive: isPreviewActive,
    timelineDownsampleSteps: previewTimelineDownsampleSteps,
    timelinePhases: previewTimelinePhases,
    clearPreview,
    setDataPhasesCount,
    setDownsampleStepsCount,
    setHasUnsavedChanges,
    setIsActive,
    setRetentionPeriod,
    setTimelineModel,
  } = useLifecyclePreview();
  const shouldShowInheritedBadge = shouldShowLifecycleInheritedBadge(definition);

  const { updateStreamLifecycle } = useUpdateStreamLifecycle(definition);
  const ilmSummary = useIlmLifecycleSummary({
    definition,
    stats,
    refreshDefinition,
    updateStreamLifecycle,
    isMetricsStream,
  });

  const isEditLifecycleFlyoutOpen = ilmSummary.isEditLifecycleFlyoutOpen;
  const hasUnsavedChangesInFlyout = ilmSummary.hasUnsavedEditLifecycleFlyoutChanges;
  const invalidPhases = ilmSummary.flyoutInvalidPhases;

  useEffect(() => {
    if (!isEditLifecycleFlyoutOpen) {
      clearPreview();
      return;
    }

    setIsActive(true);
  }, [clearPreview, isEditLifecycleFlyoutOpen, setIsActive]);

  useEffect(() => {
    if (!isEditLifecycleFlyoutOpen) {
      return;
    }

    setHasUnsavedChanges(hasUnsavedChangesInFlyout);
  }, [hasUnsavedChangesInFlyout, isEditLifecycleFlyoutOpen, setHasUnsavedChanges]);

  useEffect(() => {
    if (!isEditLifecycleFlyoutOpen) {
      return;
    }

    const retentionPeriod =
      ilmSummary.phases.find((phase) => Boolean(phase.isDelete))?.min_age ?? null;

    setTimelineModel({ phases: ilmSummary.phases, downsampleSteps: null });
    setRetentionPeriod(retentionPeriod);
    setDataPhasesCount(ilmSummary.phases.length);
  }, [
    ilmSummary.phases,
    isEditLifecycleFlyoutOpen,
    setDataPhasesCount,
    setRetentionPeriod,
    setTimelineModel,
  ]);

  useEffect(() => {
    if (!isEditLifecycleFlyoutOpen) {
      return;
    }

    if (!isMetricsStream) {
      setDownsampleStepsCount(null);
      return;
    }

    setDownsampleStepsCount(ilmSummary.phases.filter((phase) => Boolean(phase.downsample)).length);
  }, [ilmSummary.phases, isEditLifecycleFlyoutOpen, isMetricsStream, setDownsampleStepsCount]);

  const headerActions =
    definition.privileges.lifecycle &&
    ilmSummary.ilmSelectedPhasesForAdd &&
    ilmSummary.onAddIlmPhase ? (
      <IlmPhaseSelect
        selectedPhases={ilmSummary.ilmSelectedPhasesForAdd}
        excludedPhases={ilmSummary.ilmExcludedPhasesForAdd}
        onSelect={(phase: IlmPhaseSelectOption) => ilmSummary.onAddIlmPhase?.(phase)}
        data-test-subj="dataLifecycleSummaryAddPhase"
        anchorPosition="downRight"
        renderButton={renderAddPhaseButton(
          isMetricsStream ? addPhaseAndDownsamplingButtonLabel : addPhaseButtonLabel
        )}
      />
    ) : undefined;

  return (
    <>
      {ilmSummary.policyMissing && (
        <>
          <EuiCallOut
            announceOnMount
            title={i18n.translate('xpack.streams.lifecycleSummary.policyMissingTitle', {
              defaultMessage: 'ILM policy not found',
            })}
            color="warning"
            iconType="warning"
            data-test-subj="lifecycleSummary-policyMissingCallout"
          >
            {i18n.translate('xpack.streams.lifecycleSummary.policyMissingDescription', {
              defaultMessage:
                'The ILM policy "{policyName}" referenced by this data stream does not exist. Assign a valid ILM policy to restore lifecycle management.',
              values: {
                policyName: (definition.effective_lifecycle as IngestStreamLifecycleILM).ilm.policy,
              },
            })}
          </EuiCallOut>
          <EuiSpacer size="s" />
        </>
      )}
      {!ilmSummary.policyMissing && (
        <DataLifecycleSummary
          model={{
            phases: (isPreviewActive && previewTimelinePhases) || ilmSummary.phases,
            loading: ilmSummary.loading,
            downsampleSteps: previewTimelineDownsampleSteps ?? undefined,
          }}
          title={
            isIlmLifecycle(definition.effective_lifecycle)
              ? getIlmTitle(definition.effective_lifecycle.ilm.policy)
              : dataStreamLifecycleTitle
          }
          titleBadge={
            shouldShowInheritedBadge ? <EuiBadge>{inheritedBadgeLabel}</EuiBadge> : undefined
          }
          showDownsampling={isMetricsStream}
          capabilities={{ canManageLifecycle: definition.privileges.lifecycle }}
          headerActions={headerActions}
          phaseActions={{
            onRemovePhase: ilmSummary.onRemovePhase,
            onEditPhase: (phaseName) => ilmSummary.onEditPhase?.(phaseName as PhaseName),
            showPhaseActions: true,
          }}
          downsamplingActions={{
            onRemoveDownsampleStep: ilmSummary.onRemoveDownsampleStep,
            onEditDownsampleStep: (stepNumber, phaseName) =>
              ilmSummary.onEditDownsampleStep?.(stepNumber, phaseName as PhaseName | undefined),
          }}
          uiState={{
            editedPhaseName: ilmSummary.editingPhase,
            isEditLifecycleFlyoutOpen,
            invalidPhases,
          }}
        />
      )}

      {ilmSummary.modals}
    </>
  );
};

const NonIlmLifecycleSummary = ({
  definition,
  isMetricsStream,
  stats,
  refreshDefinition,
}: LifecycleSummaryProps) => {
  const {
    isActive: isPreviewActive,
    timelineDownsampleSteps: previewTimelineDownsampleSteps,
    timelinePhases: previewTimelinePhases,
    clearPreview,
    setDataPhasesCount,
    setDownsampleStepsCount,
    setHasUnsavedChanges,
    setIsActive,
    setRetentionPeriod,
    setTimelineModel,
  } = useLifecyclePreview();
  const shouldShowInheritedBadge = shouldShowLifecycleInheritedBadge(definition);

  const isDsl = isDslLifecycle(definition.effective_lifecycle);
  const { updateStreamLifecycle } = useUpdateStreamLifecycle(definition);
  const dslSummary = useDslLifecycleSummary({
    definition,
    stats,
    refreshDefinition,
    updateStreamLifecycle,
  });

  useEffect(() => {
    if (!dslSummary.isEditLifecycleFlyoutOpen) {
      clearPreview();
      return;
    }

    setIsActive(true);
    // For now DSL downsampling edits don't surface an external "unsaved changes" indicator.
    setHasUnsavedChanges(false);
  }, [clearPreview, dslSummary.isEditLifecycleFlyoutOpen, setHasUnsavedChanges, setIsActive]);

  useEffect(() => {
    if (!dslSummary.isEditLifecycleFlyoutOpen) {
      return;
    }

    const retentionPeriod =
      dslSummary.phases.find((phase) => Boolean(phase.isDelete))?.min_age ?? null;

    setTimelineModel({
      phases: dslSummary.phases,
      downsampleSteps: isDsl ? dslSummary.downsampleSteps ?? null : null,
    });
    setRetentionPeriod(retentionPeriod);
    setDataPhasesCount(dslSummary.phases.length);
  }, [
    dslSummary.downsampleSteps,
    dslSummary.isEditLifecycleFlyoutOpen,
    dslSummary.phases,
    isDsl,
    setDataPhasesCount,
    setRetentionPeriod,
    setTimelineModel,
  ]);

  useEffect(() => {
    if (!dslSummary.isEditLifecycleFlyoutOpen) {
      return;
    }

    if (!isMetricsStream) {
      setDownsampleStepsCount(null);
      return;
    }

    setDownsampleStepsCount(dslSummary.downsampleSteps?.length ?? 0);
  }, [
    dslSummary.downsampleSteps,
    dslSummary.isEditLifecycleFlyoutOpen,
    isMetricsStream,
    setDownsampleStepsCount,
  ]);

  const currentDslStepsCount = dslSummary.downsampleSteps?.length ?? 0;
  const isAddDownsampleStepDisabled = currentDslStepsCount >= MAX_DOWNSAMPLE_STEPS;
  const invalidStepIndices = dslSummary.flyoutInvalidStepIndices;

  const addDownsampleStepButton = (
    <EuiButton
      color="text"
      size="s"
      data-test-subj="dataLifecycleSummaryAddDownsampleStep"
      onClick={() => dslSummary.onAddDownsampleStep?.()}
      disabled={isAddDownsampleStepDisabled}
    >
      {addDownsampleStepButtonLabel}
    </EuiButton>
  );

  const dslHeaderActions =
    definition.privileges.lifecycle &&
    isDsl &&
    isMetricsStream &&
    dslSummary.onAddDownsampleStep ? (
      isAddDownsampleStepDisabled ? (
        <EuiToolTip position="top" content={maxDownsampleStepsTooltip}>
          {addDownsampleStepButton}
        </EuiToolTip>
      ) : (
        addDownsampleStepButton
      )
    ) : undefined;

  return (
    <>
      <DataLifecycleSummary
        model={{
          phases: (isPreviewActive && previewTimelinePhases) || dslSummary.phases,
          loading: false,
          downsampleSteps: isPreviewActive
            ? previewTimelineDownsampleSteps ?? undefined
            : isDsl
            ? dslSummary.downsampleSteps
            : undefined,
        }}
        title={dataStreamLifecycleTitle}
        titleBadge={
          shouldShowInheritedBadge ? <EuiBadge>{inheritedBadgeLabel}</EuiBadge> : undefined
        }
        showDownsampling={isMetricsStream}
        downsamplingActions={{
          onRemoveDownsampleStep: dslSummary.onRemoveDownsampleStep,
          onEditDownsampleStep: dslSummary.onEditDownsampleStep,
        }}
        capabilities={{ canManageLifecycle: definition.privileges.lifecycle }}
        headerActions={dslHeaderActions}
        uiState={{
          editedPhaseName: undefined,
          editedDownsampleStepIndex: dslSummary.isEditLifecycleFlyoutOpen
            ? dslSummary.selectedStepIndex
            : undefined,
          isEditLifecycleFlyoutOpen: dslSummary.isEditLifecycleFlyoutOpen,
          invalidStepIndices,
        }}
      />

      {dslSummary.modals}
    </>
  );
};

export const LifecycleSummary = (props: LifecycleSummaryProps) => {
  const isIlm = isIlmLifecycle(props.definition.effective_lifecycle);
  return isIlm ? <IlmLifecycleSummary {...props} /> : <NonIlmLifecycleSummary {...props} />;
};
