/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { attachmentTools, ToolResultType } from '@kbn/agent-builder-common';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { renderAttachmentElement } from '@kbn/agent-builder-common/tools/custom_rendering';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';

export const renderVisualizationPrompt = () => {
  const { esqlResults } = ToolResultType;
  const { tagName, attributes } = renderAttachmentElement;
  const chartTypeNames = Object.values(SupportedChartType)
    .map((chartType) => `\`${chartType}\``)
    .join(', ');

  return `### RENDERING ES|QL VISUALIZATION ATTACHMENTS
      When a tool call returns a result of type "${esqlResults}", you may render a visualization in the UI by using a lightweight \`${AttachmentType.esqlVisualizationInput}\` attachment and emitting a custom XML element for that attachment:

      <${tagName} ${attributes.attachmentId}="ATTACHMENT_ID_HERE" />

      The attachment should be created from the "${esqlResults}" tool result with \`${attachmentTools.add}\` and type \`${AttachmentType.esqlVisualizationInput}\`. Copy the ES|QL \`query\`, returned \`columns\`, optional \`time_range\`, and optional preferred \`chart_type\` into the attachment data. Do not include result \`values\`; they are not needed for rendering.

      **Rules**
      * This rendering flow must only be used to render tool results of type \`${esqlResults}\`.
      * Do not render \`${esqlResults}\` results directly with the legacy \`<visualization />\` tag; render the \`${AttachmentType.esqlVisualizationInput}\` attachment with \`<${tagName}>\`.
      * Do not call \`create_visualization\` for this ES|QL result rendering flow.
      * You can specify an optional \`chart_type\` in the attachment data using one of the following values: ${chartTypeNames}.
      * If the user does NOT specify a chart type in their message, omit \`chart_type\`. The frontend will choose an appropriate chart type automatically.
      * You must copy the \`attachment_id\` from the \`${attachmentTools.add}\` response into the \`${attributes.attachmentId}\` element attribute verbatim.
      * Do not invent, alter, or guess \`attachment_id\`. You must use the exact id provided in the tool response.
      * You must not include any other attributes or content within the \`<${tagName}>\` element.
      * If no \`${AttachmentType.esqlVisualizationInput}\` attachment was created for the ES|QL result, do not render an inline visualization.

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

      First call \`${attachmentTools.add}\`:
      {
        "type": "${AttachmentType.esqlVisualizationInput}",
        "data": {
          "query": "FROM traces-apm* | STATS count() BY BUCKET(@timestamp, 1h)",
          "columns": [...]
        }
      }

      The \`${attachmentTools.add}\` response includes:
      {
        "type": "other",
        "data": {
          "attachment_id": "LiDoF1",
          "type": "${AttachmentType.esqlVisualizationInput}",
          "version": 1
        }
      }

      To visualize this response your reply should be:
      <${tagName} ${attributes.attachmentId}="LiDoF1"/>`;
};
