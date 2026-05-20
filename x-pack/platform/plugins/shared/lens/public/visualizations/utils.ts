/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getColumnByAccessor } from '@kbn/chart-expressions-common';
import {
  getEmptyRowsDefaultForVisualizationState,
  type ParamEditorCustomProps,
  type VisualizationConfigProps,
  type VisualizationDimensionGroupConfig,
} from '@kbn/lens-common';

export function getColumnFromActiveData({
  accessor,
  layerId,
  activeData,
}: {
  accessor: string | undefined;
  layerId: string;
  activeData: VisualizationConfigProps['frame']['activeData'];
}) {
  const columns = activeData?.[layerId]?.columns ?? activeData?.default?.columns;

  if (!accessor || !columns) {
    return undefined;
  }

  return getColumnByAccessor(accessor, columns);
}

interface VisualizationStateDefaults {
  paramEditorCustomProps?: ParamEditorCustomProps;
}

interface ApplyVisualizationStateDefaultsArgs {
  groups: VisualizationDimensionGroupConfig[];
  groupIds?: string[];
  visualizationType: string | null | undefined;
  visualizationState: unknown;
}

const getVisualizationStateDefaults = (
  visualizationType: string | null | undefined,
  visualizationState: unknown
): VisualizationStateDefaults | undefined => {
  const emptyRowsDefault = getEmptyRowsDefaultForVisualizationState(
    visualizationType,
    visualizationState
  );

  if (emptyRowsDefault === undefined) {
    return;
  }

  return {
    paramEditorCustomProps: {
      emptyRowsDefault,
    },
  };
};

const mergeParamEditorCustomProps = (
  group: VisualizationDimensionGroupConfig,
  paramEditorCustomProps: ParamEditorCustomProps
): VisualizationDimensionGroupConfig => ({
  ...group,
  paramEditorCustomProps: {
    ...paramEditorCustomProps,
    ...group.paramEditorCustomProps,
  },
});

/**
 * Applies shared visualization-state defaults to the target dimension groups.
 */
export function applyVisualizationStateDefaults({
  groups,
  groupIds,
  visualizationType,
  visualizationState,
}: ApplyVisualizationStateDefaultsArgs): VisualizationDimensionGroupConfig[] {
  const defaults = getVisualizationStateDefaults(visualizationType, visualizationState);
  const paramEditorCustomProps = defaults?.paramEditorCustomProps;

  if (!paramEditorCustomProps) {
    return groups;
  }

  return groups.map((group) =>
    !groupIds || groupIds.includes(group.groupId)
      ? mergeParamEditorCustomProps(group, paramEditorCustomProps)
      : group
  );
}
