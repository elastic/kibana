/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import {
  LENS_SAVE_TO_DASHBOARD_ACTION_ID,
  type InlineEditLensEmbeddableContext,
  type LensApi,
  type TypedLensByValueInput,
} from '@kbn/lens-plugin/public';
import { ON_OPEN_PANEL_MENU } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { Action } from '@kbn/ui-actions-plugin/public';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionButtonType,
  type ActionButton,
  type InlineRenderCallbacks,
} from '@kbn/agent-builder-browser/attachments';
import { i18n } from '@kbn/i18n';
import type { VisualizationServices } from '../services';
import {
  visualizationEmbeddableStyles,
  visualizationTimePickerContainerClassName,
  visualizationHeaderStyles,
} from './styles';
import { DEFAULT_VISUALIZATION_HEIGHT } from './get_visualization_dimensions';
import { useVisPreviewUnifiedSearch } from './use_vis_preview_unified_search';

const saveButtonLabel = i18n.translate('xpack.agentBuilder.visualization.saveToDashboard', {
  defaultMessage: 'Save to dashboard',
});

const dashboardWriteControlsDisabledReason = i18n.translate(
  'xpack.agentBuilder.visualization.dashboardWriteControlsDisabledReason',
  {
    defaultMessage:
      'You need dashboard write permissions to edit visualizations or save them to a dashboard.',
  }
);

const viewConfigurationLabel = i18n.translate(
  'xpack.agentBuilder.visualization.viewConfiguration',
  {
    defaultMessage: 'View configuration',
  }
);

interface BaseVisualizationProps {
  services: VisualizationServices;
  lensInput: TypedLensByValueInput | undefined;
  setLensInput: (input: TypedLensByValueInput) => void;
  isLoading: boolean;
  registerActionButtons: InlineRenderCallbacks['registerActionButtons'];
  height?: number;
}

export function BaseVisualization({
  services,
  lensInput,
  setLensInput,
  isLoading,
  registerActionButtons,
  height = DEFAULT_VISUALIZATION_HEIGHT,
}: BaseVisualizationProps) {
  const { lens, uiActions, application, unifiedSearch } = services;
  const lensApiRef = useRef<LensApi>();
  const [lensLoadEvent, setLensLoadEvent] = useState<
    InlineEditLensEmbeddableContext['lensEvent'] | null
  >(null);

  const SearchBar = unifiedSearch.ui.SearchBar;
  const canWriteDashboards = application?.capabilities.dashboard_v2?.showWriteControls === true;

  const { searchBarProps, effectiveTimeRange, onBrushEnd } = useVisPreviewUnifiedSearch({
    timeRange: lensInput?.timeRange,
  });

  const lensInputWithTimeRange = useMemo(
    () =>
      lensInput && effectiveTimeRange ? { ...lensInput, timeRange: effectiveTimeRange } : lensInput,
    [lensInput, effectiveTimeRange]
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

  const onApiAvailable = useCallback((api: unknown) => {
    lensApiRef.current = api as LensApi;
  }, []);

  const onOpenSave = useCallback(async () => {
    const lensApi = lensApiRef.current;
    if (!lensApi) {
      return;
    }

    // the Save to dashboard action is provided by the Lens embeddable
    const saveToDashboardAction = (await uiActions.getAction(
      LENS_SAVE_TO_DASHBOARD_ACTION_ID
    )) as Action<{ embeddable: LensApi }>;
    await saveToDashboardAction.execute({
      embeddable: lensApi,
      trigger: { id: ON_OPEN_PANEL_MENU },
    });
  }, [uiActions]);
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
        <SearchBar {...searchBarProps} />
      </div>

      <div css={visualizationEmbeddableStyles(height)}>
        {isLoading ? (
          <EuiLoadingSpinner />
        ) : (
          lensInputWithTimeRange && (
            <lens.EmbeddableComponent
              {...lensInputWithTimeRange}
              style={{ height: '100%' }}
              onBrushEnd={onBrushEnd}
              onLoad={onLoad}
              telemetrySource="chat"
              onApiAvailable={onApiAvailable}
            />
          )
        )}
      </div>
    </>
  );
}
