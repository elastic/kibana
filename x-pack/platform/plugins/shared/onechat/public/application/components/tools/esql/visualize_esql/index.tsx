/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import type { InlineEditLensEmbeddableContext, LensPublicStart } from '@kbn/lens-plugin/public';
import type { ChartType } from '@kbn/visualization-utils';
import React, { useCallback, useState } from 'react';
import type { TabularDataResult } from '@kbn/onechat-common/tools/tool_result';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { visualizationWrapper } from './styles';
import { useLensInput } from './use_lens_input';
import { VisualizationActions } from './visualization_actions';

const VISUALIZATION_HEIGHT = 240;

export function VisualizeESQL({
  lens,
  dataViews,
  uiActions,
  esqlColumns,
  esqlQuery,
  preferredChartType,
}: {
  lens: LensPublicStart;
  dataViews: DataViewsServicePublic;
  esqlColumns: TabularDataResult['data']['columns'] | undefined;
  uiActions: UiActionsStart;
  esqlQuery: string;
  preferredChartType?: ChartType;
  errorMessages?: string[];
}) {
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [lensLoadEvent, setLensLoadEvent] = useState<
    InlineEditLensEmbeddableContext['lensEvent'] | null
  >(null);

  const { lensInput, setLensInput, isLoading } = useLensInput({
    lens,
    dataViews,
    esqlQuery,
    esqlColumns,
    preferredChartType,
  });

  const { euiTheme } = useEuiTheme();

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
      <div
        data-test-subj="lensVisualization"
        css={visualizationWrapper(euiTheme, VISUALIZATION_HEIGHT)}
      >
        {!isLoading && lensInput && (
          <VisualizationActions
            onSave={onOpenSave}
            uiActions={uiActions}
            lensInput={lensInput}
            lensLoadEvent={lensLoadEvent}
            setLensInput={setLensInput}
          />
        )}
        {isLoading ? (
          <EuiLoadingSpinner />
        ) : (
          lensInput && (
            <lens.EmbeddableComponent {...lensInput} style={{ height: '100%' }} onLoad={onLoad} />
          )
        )}
      </div>
      {isSaveModalOpen && lensInput && (
        <lens.SaveModalComponent
          initialInput={lensInput}
          onClose={onCloseSave}
          isSaveable={false}
        />
      )}
    </>
  );
}
