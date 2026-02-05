/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { ChartType } from '@kbn/visualization-utils';
import React from 'react';
import type { EsqlResults } from '@kbn/agent-builder-common/tools/tool_result';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { useLensInput } from './use_lens_input';
import { BaseVisualization } from '../shared/base_visualization';

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
  esqlColumns: EsqlResults['data']['columns'] | undefined;
  uiActions: UiActionsStart;
  esqlQuery: string;
  preferredChartType?: ChartType;
  errorMessages?: string[];
}) {
  const { lensInput, setLensInput, isLoading } = useLensInput({
    lens,
    dataViews,
    esqlQuery,
    esqlColumns,
    preferredChartType,
  });

  return (
    <BaseVisualization
      lens={lens}
      uiActions={uiActions}
      lensInput={lensInput}
      setLensInput={setLensInput}
      isLoading={isLoading}
    />
  );
}
