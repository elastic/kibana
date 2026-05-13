/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { ChartType } from '@kbn/visualization-utils';
import React, { useCallback, useState } from 'react';
import { EuiSplitPanel } from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { EsqlResults } from '@kbn/agent-builder-common/tools/tool_result';
import type { TimeRange } from '@kbn/agent-builder-common';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { ActionButton } from '@kbn/agent-builder-browser/attachments';
import { useLensInput } from './use_lens_input';
import { BaseVisualization } from '../shared/base_visualization';
import { FallbackVisualizationActions } from '../shared/visualization_actions';
import { visualizationWrapperStyles } from '../shared/styles';

export function VisualizeESQL({
  lens,
  dataViews,
  uiActions,
  esqlColumns,
  esqlQuery,
  preferredChartType,
  timeRange,
}: {
  lens: LensPublicStart;
  dataViews: DataViewsServicePublic;
  esqlColumns: EsqlResults['data']['columns'] | undefined;
  uiActions: UiActionsStart;
  esqlQuery: string;
  preferredChartType?: ChartType;
  errorMessages?: string[];
  timeRange?: TimeRange;
}) {
  const { lensInput, setLensInput, isLoading } = useLensInput({
    lens,
    dataViews,
    esqlQuery,
    esqlColumns,
    preferredChartType,
    timeRange,
  });
  const [actionButtons, setActionButtons] = useState<ActionButton[]>([]);
  const registerActionButtons = useCallback((buttons: ActionButton[]) => {
    setActionButtons(buttons);
  }, []);

  return (
    <EuiSplitPanel.Outer
      grow
      hasShadow={false}
      hasBorder={true}
      css={[
        visualizationWrapperStyles,
        ({ euiTheme }: UseEuiTheme) =>
          css({
            marginBlockEnd: euiTheme.size.m,
          }),
      ]}
    >
      {actionButtons.length > 0 && <FallbackVisualizationActions buttons={actionButtons} />}
      <BaseVisualization
        lens={lens}
        uiActions={uiActions}
        lensInput={lensInput}
        setLensInput={setLensInput}
        isLoading={isLoading}
        registerActionButtons={registerActionButtons}
      />
    </EuiSplitPanel.Outer>
  );
}
