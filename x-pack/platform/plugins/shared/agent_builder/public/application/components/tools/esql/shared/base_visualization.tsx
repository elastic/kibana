/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner, EuiSuperDatePicker } from '@elastic/eui';
import type { InlineEditLensEmbeddableContext, LensPublicStart } from '@kbn/lens-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import {
  ActionButtonType,
  type ActionButton,
  type InlineRenderCallbacks,
} from '@kbn/agent-builder-browser/attachments';
import { i18n } from '@kbn/i18n';
import {
  visualizationEmbeddableStyles,
  visualizationTimePickerContainerClassName,
  visualizationHeaderStyles,
} from './styles';
import { useTimeRange } from './use_time_range';

const saveButtonLabel = i18n.translate(
  'xpack.agentBuilder.conversation.visualization.saveToDashboard',
  {
    defaultMessage: 'Save to dashboard',
  }
);

const dashboardWriteControlsDisabledReason = i18n.translate(
  'xpack.agentBuilder.conversation.visualization.dashboardWriteControlsDisabledReason',
  {
    defaultMessage:
      'You need dashboard write permissions to edit visualizations or save them to a dashboard.',
  }
);

const viewConfigurationLabel = i18n.translate(
  'xpack.agentBuilder.conversation.visualization.edit',
  {
    defaultMessage: 'View configuration',
  }
);

const VISUALIZATION_HEIGHT = 240;

interface BaseVisualizationProps {
  lens: LensPublicStart;
  uiActions: UiActionsStart;
  lensInput: TypedLensByValueInput | undefined;
  setLensInput: (input: TypedLensByValueInput) => void;
  isLoading: boolean;
  registerActionButtons: InlineRenderCallbacks['registerActionButtons'];
}

export function BaseVisualization({
  lens,
  uiActions,
  lensInput,
  setLensInput,
  isLoading,
  registerActionButtons,
}: BaseVisualizationProps) {
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [lensLoadEvent, setLensLoadEvent] = useState<
    InlineEditLensEmbeddableContext['lensEvent'] | null
  >(null);

  const {
    services: { application },
  } = useKibana();
  const canWriteDashboards = application?.capabilities.dashboard_v2?.showWriteControls === true;
  const timeRangeControl = useTimeRange({ timeRange: lensInput?.timeRange });
  const selectedTimeRange = timeRangeControl?.selectedTimeRange;
  const lensInputWithTimeRange = useMemo(
    () =>
      lensInput && selectedTimeRange ? { ...lensInput, timeRange: selectedTimeRange } : lensInput,
    [lensInput, selectedTimeRange]
  );

  const onLoad = useCallback(
    (
      _isLoading: boolean,
      adapters: InlineEditLensEmbeddableContext['lensEvent']['adapters'] | undefined,
      dataLoading$?: InlineEditLensEmbeddableContext['lensEvent']['dataLoading$']
    ) => {
      if (!_isLoading && adapters?.tables?.tables) {
        setLensLoadEvent({ adapters, dataLoading$ });
      }
    },
    []
  );

  const onOpenSave = useCallback(() => setIsSaveModalOpen(true), []);
  const onCloseSave = useCallback(() => setIsSaveModalOpen(false), []);
  const saveToDashboard = useCallback(() => {
    if (canWriteDashboards) {
      onOpenSave();
    }
  }, [canWriteDashboards, onOpenSave]);
  const viewConfiguration = useCallback(() => {
    if (!canWriteDashboards || !lensInput?.attributes) {
      return;
    }

    uiActions.executeTriggerActions('IN_APP_EMBEDDABLE_EDIT_TRIGGER', {
      applyButtonLabel: saveButtonLabel,
      attributes: lensInput.attributes,
      lensEvent: lensLoadEvent ?? { adapters: {} },
      onUpdate: (attrs: TypedLensByValueInput['attributes']) =>
        setLensInput({ ...lensInput, attributes: attrs }),
      onApply: onOpenSave,
      onCancel: () => {},
      container: null,
    });
  }, [canWriteDashboards, lensInput, lensLoadEvent, onOpenSave, setLensInput, uiActions]);

  const visualizationActionButtons = useMemo<ActionButton[]>(() => {
    const disabledReason = canWriteDashboards ? undefined : dashboardWriteControlsDisabledReason;

    return [
      {
        label: viewConfigurationLabel,
        icon: 'pencil',
        type: ActionButtonType.SECONDARY,
        disabled: !canWriteDashboards,
        disabledReason,
        handler: viewConfiguration,
      },
      {
        label: saveButtonLabel,
        icon: 'save',
        type: ActionButtonType.PRIMARY,
        disabled: !canWriteDashboards,
        disabledReason,
        handler: saveToDashboard,
      },
    ];
  }, [canWriteDashboards, saveToDashboard, viewConfiguration]);

  useEffect(() => {
    if (isLoading || !lensInput) {
      registerActionButtons([]);
      return;
    }

    registerActionButtons(visualizationActionButtons);

    return () => registerActionButtons([]);
  }, [isLoading, lensInput, registerActionButtons, visualizationActionButtons]);

  return (
    <>
      <div css={visualizationHeaderStyles} className={visualizationTimePickerContainerClassName}>
        {timeRangeControl && (
          <EuiSuperDatePicker
            data-test-subj="agentBuilderVisualizeLensTimeRangePicker"
            start={timeRangeControl.selectedTimeRange.from}
            end={timeRangeControl.selectedTimeRange.to}
            onTimeChange={timeRangeControl.onTimeChange}
            onRefresh={() => undefined}
            showUpdateButton={false}
            compressed
            width="auto"
          />
        )}
      </div>

      <div css={visualizationEmbeddableStyles(VISUALIZATION_HEIGHT)}>
        {isLoading ? (
          <EuiLoadingSpinner />
        ) : (
          lensInputWithTimeRange && (
            <lens.EmbeddableComponent
              {...lensInputWithTimeRange}
              style={{ height: '100%' }}
              onBrushEnd={timeRangeControl?.onBrushEnd}
              onLoad={onLoad}
            />
          )
        )}
      </div>
      {isSaveModalOpen && lensInputWithTimeRange && (
        <lens.SaveModalComponent
          initialInput={lensInputWithTimeRange}
          onClose={onCloseSave}
          isSaveable={false}
        />
      )}
    </>
  );
}
