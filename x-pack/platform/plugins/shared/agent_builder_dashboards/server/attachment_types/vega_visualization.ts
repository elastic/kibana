/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import {
  VEGA_VISUALIZATION_ATTACHMENT_TYPE,
  vegaVisualizationAttachmentDataSchema,
  type VegaVisualizationAttachmentData,
} from '@kbn/agent-builder-dashboards-common';

const getMarkType = (spec: Record<string, unknown>): string | undefined => {
  const mark = spec.mark;
  if (typeof mark === 'string') {
    return mark;
  }
  if (mark && typeof mark === 'object' && 'type' in mark && typeof mark.type === 'string') {
    return mark.type;
  }
  return undefined;
};

const formatVegaAttachment = (
  attachmentId: string,
  data: VegaVisualizationAttachmentData
): string => {
  const dialectLabel = data.dialect === 'vega-lite' ? 'Vega-Lite' : 'Vega';
  const markType = getMarkType(data.spec);
  const markSuffix = markType ? `, mark: ${markType}` : '';
  return `${dialectLabel} "${data.title}" (attachment.id: "${attachmentId}")${markSuffix}`;
};

/**
 * Creates the definition for the `vega-visualization` attachment type.
 *
 * Value-only attachment: no origin / saved object backing, no staleness check.
 * To revise a Vega chart the agent creates a new attachment.
 */
export const createVegaVisualizationAttachmentType = (): AttachmentTypeDefinition<
  typeof VEGA_VISUALIZATION_ATTACHMENT_TYPE,
  VegaVisualizationAttachmentData
> => ({
  id: VEGA_VISUALIZATION_ATTACHMENT_TYPE,
  validate: (input) => {
    const parseResult = vegaVisualizationAttachmentDataSchema.safeParse(input);
    if (parseResult.success) {
      return { valid: true, data: parseResult.data };
    }
    return { valid: false, error: parseResult.error.message };
  },
  format: (attachment) => ({
    getRepresentation: () => ({
      type: 'text',
      value: formatVegaAttachment(attachment.id, attachment.data),
    }),
  }),
  getAgentDescription: () =>
    'A vega-visualization attachment is a Vega or Vega-Lite chart with an embedded ES|QL data source. Rendering it inline displays the chart in the conversation. To modify a Vega chart, create a new attachment with a revised spec via the `platform.dashboard.create_vega_visualization` tool; there is no in-place update. To place it on a dashboard, use `platform.dashboard.manage_dashboard` `add_panels` with `kind: "attachment"`.',
  getTools: () => [],
});
