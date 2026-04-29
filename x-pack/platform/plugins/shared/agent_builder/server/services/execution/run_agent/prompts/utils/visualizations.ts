/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools, ToolResultType } from '@kbn/agent-builder-common';
import { renderAttachmentElement } from '@kbn/agent-builder-common/tools/custom_rendering';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';

export const renderVisualizationPrompt = () => {
  const { esqlResults } = ToolResultType;
  const { tagName, attributes } = renderAttachmentElement;
  const chartTypeNames = Object.values(SupportedChartType)
    .map((chartType) => `\`${chartType}\``)
    .join(', ');

  return `### RENDERING VISUALIZATION ATTACHMENTS
      When a tool call returns a result of type "${esqlResults}", you may render a visualization in the UI by creating a visualization attachment and emitting a custom XML element for that attachment:

      <${tagName} ${attributes.attachmentId}="ATTACHMENT_ID_HERE" />

      Use \`${platformCoreTools.createVisualization}\` to create the visualization attachment from the ES|QL result. Pass the ES|QL query from the tool result to \`${platformCoreTools.createVisualization}\` using its \`esql\` parameter. After \`${platformCoreTools.createVisualization}\` returns \`data.attachment_id\`, copy that attachment ID into the \`${attributes.attachmentId}\` attribute.

      **Rules**
      * This rendering flow must only be used to render tool results of type \`${esqlResults}\`.
      * Do not render \`${esqlResults}\` results directly with a custom visualization tag; render the visualization attachment with \`<${tagName}>\`.
      * You can specify an optional chart type in the \`${platformCoreTools.createVisualization}\` call using one of the following values: ${chartTypeNames}.
      * If the user does NOT specify a chart type in their message, omit \`chartType\`. The tool will choose an appropriate chart type automatically.
      * You must copy the \`attachment_id\` from the \`${platformCoreTools.createVisualization}\` response into the \`${attributes.attachmentId}\` element attribute verbatim.
      * Do not invent, alter, or guess \`attachment_id\`. You must use the exact id provided in the tool response.
      * You must not include any other attributes or content within the \`<${tagName}>\` element.
      * If \`${platformCoreTools.createVisualization}\` does not return \`data.attachment_id\`, do not render an inline visualization; explain that the visualization could not be persisted as an attachment.

      **Example Usage:**

      Tool response includes:
      {
        "tool_result_id": "EsqlResult1",
        "type": "${esqlResults}",
        "data": {
          "query": "FROM traces-apm* | STATS count() BY BUCKET(@timestamp, 1h)",
          "columns": [...],
          "values": [...]
        }
      }

      First call \`${platformCoreTools.createVisualization}\`:
      {
        "query": "Show count over time",
        "esql": "FROM traces-apm* | STATS count() BY BUCKET(@timestamp, 1h)"
      }

      The \`${platformCoreTools.createVisualization}\` response includes:
      {
        "type": "visualization",
        "data": {
          "attachment_id": "LiDoF1",
          "version": 1
        }
      }

      To visualize this response your reply should be:
      <${tagName} ${attributes.attachmentId}="LiDoF1"/>`;
};
