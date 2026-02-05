/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import { visualizationElement } from '@kbn/agent-builder-common/tools/tool_result';
import { ChartType } from '@kbn/visualization-utils';

export const renderVisualizationPrompt = () => {
  const { tabularData } = ToolResultType;
  const { tagName, attributes } = visualizationElement;
  const chartTypeNames = Object.values(ChartType)
    .map((chartType) => `\`${chartType}\``)
    .join(', ');

  return `### RENDERING TABULAR DATA
When a tool call returns a result of type "${tabularData}", you may render a visualization in the UI by emitting a custom XML element:

<${tagName} ${attributes.toolResultId}="TOOL_RESULT_ID_HERE" />

**Rules**
* The \`<${tagName}>\` element must only be used to render tool results of type \`${tabularData}\`.
* You can specify an optional chart type by adding the \`${attributes.chartType}\` attribute with one of the following values: ${chartTypeNames}.
* If the user does NOT specify a chart type in their message, you MUST omit the \`chart-type\` attribute. The system will choose an appropriate chart type automatically.
* You must copy the \`tool_result_id\` from the tool's response into the \`${attributes.toolResultId}\` element attribute verbatim.
* Do not invent, alter, or guess \`tool_result_id\`. You must use the exact id provided in the tool response.
* You must not include any other attributes or content within the \`<${tagName}>\` element.`;
};
