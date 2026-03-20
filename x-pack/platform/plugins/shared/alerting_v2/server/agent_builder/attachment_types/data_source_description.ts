/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import {
  DATA_SOURCE_DESCRIPTION_TYPE,
  dataSourceDescriptionDataSchema,
  type DataSourceDescriptionData,
} from '../../../common/attachment_types';

export const createDataSourceDescriptionType = (): AttachmentTypeDefinition<
  typeof DATA_SOURCE_DESCRIPTION_TYPE,
  DataSourceDescriptionData
> => ({
  id: DATA_SOURCE_DESCRIPTION_TYPE,
  isReadonly: true,
  validate: (input) => {
    const result = dataSourceDescriptionDataSchema.safeParse(input);
    if (result.success) {
      return { valid: true, data: result.data };
    }
    return { valid: false, error: result.error.message };
  },
  format: (attachment) => ({
    getRepresentation: () => {
      const { data } = attachment;
      const fieldCount =
        data.schema && typeof data.schema === 'object' && !Array.isArray(data.schema)
          ? Object.keys(data.schema as Record<string, unknown>).length
          : 0;
      const patternCount = Array.isArray(data.logPatterns) ? data.logPatterns.length : 0;
      const errorCount = Array.isArray(data.errorSamples) ? data.errorSamples.length : 0;
      const kiCount = data.knowledgeIndicators?.indicators?.length ?? 0;

      const lines: string[] = [`Data source: "${data.index}" (attachment.id: "${attachment.id}")`];
      if (data.dataSourceType) {
        lines.push(`Type: ${data.dataSourceType}`);
      }
      if (data.docCount != null) {
        lines.push(`Documents: ${data.docCount.toLocaleString()}`);
      }
      lines.push(`Time range: ${data.timeRange.start} to ${data.timeRange.end}`);
      lines.push(`ES|QL query: ${data.esqlQuery}`);
      if (fieldCount > 0) {
        lines.push(`Schema fields: ${fieldCount}`);
      }
      if (patternCount > 0) {
        lines.push(`Log patterns: ${patternCount}`);
      }
      if (errorCount > 0) {
        lines.push(`Error samples: ${errorCount}`);
      }
      if (kiCount > 0) {
        lines.push(`Knowledge indicators: ${kiCount} (${data.knowledgeIndicators!.source})`);
      }

      return {
        type: 'text',
        value: lines.join('\n'),
      };
    },
  }),
  getAgentDescription: () =>
    'A data source description attachment representing a discovered or analyzed data source. ' +
    'Rendering it inline displays an interactive data source card with a Preview button that ' +
    'opens an ES|QL editor, data table, and "View in Discover" navigation. ' +
    'ALWAYS render these attachments inline using <render_attachment id="ATTACHMENT_ID"/> so the ' +
    'user sees clickable cards. Present a brief text summary alongside each rendered attachment.',
  getTools: () => [],
});
