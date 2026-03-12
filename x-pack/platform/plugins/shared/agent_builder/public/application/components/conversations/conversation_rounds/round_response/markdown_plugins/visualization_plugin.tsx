/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiCode, EuiText } from '@elastic/eui';
import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import {
  type EsqlResults,
  type VisualizationResult,
  ToolResultType,
} from '@kbn/agent-builder-common/tools/tool_result';
import {
  visualizationElement,
  type VisualizationElementAttributes,
} from '@kbn/agent-builder-common/tools/custom_rendering';

import type { AgentBuilderStartDependencies } from '../../../../../../types';
import { VisualizeESQL } from '../../../../tools/esql/visualize_esql';
import { VisualizeLens } from '../../../../tools/esql/visualize_lens';
import { createTagParser, findToolResult } from './utils';

export const visualizationTagParser = createTagParser({
  tagName: visualizationElement.tagName,
  getAttributes: (value, extractAttr) => ({
    toolResultId: extractAttr(value, visualizationElement.attributes.toolResultId),
    chartType: extractAttr(value, visualizationElement.attributes.chartType),
  }),
  assignAttributes: (node, attributes) => {
    node.type = visualizationElement.tagName;
    node.toolResultId = attributes.toolResultId;
    node.chartType = attributes.chartType;
    delete node.value;
  },
  createNode: (attributes, position) => ({
    type: visualizationElement.tagName,
    toolResultId: attributes.toolResultId,
    chartType: attributes.chartType,
    position,
  }),
});

export function createVisualizationRenderer({
  startDependencies,
  stepsFromCurrentRound,
  stepsFromPrevRounds,
}: {
  startDependencies: AgentBuilderStartDependencies;
  stepsFromCurrentRound: ConversationRoundStep[];
  stepsFromPrevRounds: ConversationRoundStep[];
}) {
  return (props: VisualizationElementAttributes) => {
    const { toolResultId, chartType } = props;

    if (!toolResultId) {
      return (
        <EuiText>Visualization missing {visualizationElement.attributes.toolResultId}.</EuiText>
      );
    }

    const steps = [...stepsFromPrevRounds, ...stepsFromCurrentRound];

    const ToolResultAttribute = (
      <EuiCode>
        {visualizationElement.attributes.toolResultId}={toolResultId}
      </EuiCode>
    );

    // First, look for esql results (from execute_esql)
    let toolResult: EsqlResults | VisualizationResult | undefined = findToolResult<EsqlResults>(
      steps,
      toolResultId,
      ToolResultType.esqlResults
    );

    // If not found, look for visualization results (from create_visualization)
    if (!toolResult) {
      toolResult = findToolResult<VisualizationResult>(
        steps,
        toolResultId,
        ToolResultType.visualization
      );
    }

    if (!toolResult) {
      return <EuiText>Unable to find visualization for {ToolResultAttribute}.</EuiText>;
    }

    // Handle visualization result (pre-built Lens config)
    if (toolResult.type === 'visualization') {
      const { visualization } = toolResult.data;
      return (
        <VisualizeLens
          lensConfig={visualization}
          dataViews={startDependencies.dataViews}
          lens={startDependencies.lens}
          uiActions={startDependencies.uiActions}
        />
      );
    }

    const { columns, query } = toolResult.data;

    if (!query) {
      return <EuiText>Unable to find esql query for {ToolResultAttribute}.</EuiText>;
    }

    return (
      <VisualizeESQL
        lens={startDependencies.lens}
        dataViews={startDependencies.dataViews}
        uiActions={startDependencies.uiActions}
        esqlQuery={query}
        esqlColumns={columns}
        preferredChartType={chartType}
      />
    );
  };
}
