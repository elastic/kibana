/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner, EuiSuperDatePicker } from '@elastic/eui';
import type { InlineEditLensEmbeddableContext, LensPublicStart } from '@kbn/lens-plugin/public';
import React, { useCallback, useMemo, useState } from 'react';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import {
  visualizationEmbeddableStyles,
  visualizationHeaderStyles,
  visualizationWrapperStyles,
} from './styles';
import { VisualizationActions } from './visualization_actions';
import { useTimeRange } from './use_time_range';

const VISUALIZATION_HEIGHT = 240;

interface BaseVisualizationProps {
  lens: LensPublicStart;
  uiActions: UiActionsStart;
  lensInput: TypedLensByValueInput | undefined;
  setLensInput: (input: TypedLensByValueInput) => void;
  isLoading: boolean;
}

export function BaseVisualization({
  lens,
  uiActions,
  lensInput,
  setLensInput,
  isLoading,
}: BaseVisualizationProps) {
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [lensLoadEvent, setLensLoadEvent] = useState<
    InlineEditLensEmbeddableContext['lensEvent'] | null
  >(null);

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

  return (
    <>
      <div data-test-subj="lensVisualization" css={visualizationWrapperStyles}>
        <div css={visualizationHeaderStyles}>
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
          {!isLoading && lensInput && (
            <VisualizationActions
              onSave={onOpenSave}
              uiActions={uiActions}
              lensInput={lensInput}
              lensLoadEvent={lensLoadEvent}
              setLensInput={setLensInput}
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
