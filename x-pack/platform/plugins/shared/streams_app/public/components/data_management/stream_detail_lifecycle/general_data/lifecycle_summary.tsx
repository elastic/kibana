/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import type { Streams } from '@kbn/streams-schema';
import { isDslLifecycle, isIlmLifecycle } from '@kbn/streams-schema';
import type { PhaseName } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiToolTip } from '@elastic/eui';
import type { DataStreamStats } from '../hooks/use_data_stream_stats';
import { DataLifecycleSummary } from '../common/data_lifecycle/data_lifecycle_summary';
import { useUpdateStreamLifecycle } from '../hooks/use_update_stream_lifecycle';
import { useIlmLifecycleSummary } from '../hooks/use_ilm_lifecycle_summary';
import { useDslLifecycleSummary } from '../hooks/use_dsl_lifecycle_summary';
import type {
  IlmPhaseSelectOption,
  IlmPhaseSelectRenderButtonProps,
} from '../downsampling/ilm_phase_select/ilm_phase_select';
import { IlmPhaseSelect } from '../downsampling/ilm_phase_select/ilm_phase_select';

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

const renderAddPhaseButton = (label: string) => (buttonProps: IlmPhaseSelectRenderButtonProps) => {
  const button = (
    <EuiButton {...buttonProps} color="text" size="s" iconType="arrowDown" iconSide="right">
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
  onFlyoutOpenChange?: (isOpen: boolean) => void;
  onFlyoutUnsavedChangesChange?: (hasUnsavedChanges: boolean) => void;
}

const IlmLifecycleSummary = ({
  definition,
  isMetricsStream,
  stats,
  refreshDefinition,
  onFlyoutOpenChange,
  onFlyoutUnsavedChangesChange,
}: LifecycleSummaryProps) => {
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

  useEffect(() => {
    onFlyoutOpenChange?.(isEditLifecycleFlyoutOpen);
  }, [isEditLifecycleFlyoutOpen, onFlyoutOpenChange]);

  useEffect(() => {
    onFlyoutUnsavedChangesChange?.(hasUnsavedChangesInFlyout);
  }, [hasUnsavedChangesInFlyout, onFlyoutUnsavedChangesChange]);

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
      <DataLifecycleSummary
        model={{
          phases: ilmSummary.phases,
          loading: ilmSummary.loading,
        }}
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
        }}
      />

      {ilmSummary.modals}
    </>
  );
};

const NonIlmLifecycleSummary = ({
  definition,
  isMetricsStream,
  stats,
  onFlyoutOpenChange,
  onFlyoutUnsavedChangesChange,
}: LifecycleSummaryProps) => {
  const isDsl = isDslLifecycle(definition.effective_lifecycle);
  const dslSummary = useDslLifecycleSummary({
    definition,
    stats,
  });

  useEffect(() => {
    onFlyoutOpenChange?.(false);
    onFlyoutUnsavedChangesChange?.(false);
  }, [onFlyoutOpenChange, onFlyoutUnsavedChangesChange]);

  return (
    <DataLifecycleSummary
      model={{
        phases: dslSummary.phases,
        loading: false,
        downsampleSteps: isDsl ? dslSummary.downsampleSteps : undefined,
      }}
      showDownsampling={isMetricsStream}
      capabilities={{ canManageLifecycle: definition.privileges.lifecycle }}
      uiState={{
        editedPhaseName: undefined,
        isEditLifecycleFlyoutOpen: false,
      }}
    />
  );
};

export const LifecycleSummary = (props: LifecycleSummaryProps) => {
  const isIlm = isIlmLifecycle(props.definition.effective_lifecycle);
  return isIlm ? <IlmLifecycleSummary {...props} /> : <NonIlmLifecycleSummary {...props} />;
};
