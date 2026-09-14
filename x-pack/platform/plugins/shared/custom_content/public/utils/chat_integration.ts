/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { FetchContext } from '@kbn/presentation-publishing';
import {
  CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
  MAX_FETCH_CONTEXT_BYTES,
  MAX_SHORT_FIELD_LENGTH,
  type CustomContentContextAttachmentData,
} from '../../common/panel_context_attachment';

/**
 * Deterministic per-panel attachment id. Attachments are merged by `id` and anything without one is
 * appended, so a stable id lets a re-pushed panel context replace the previous snapshot instead of
 * accumulating duplicates — which the update tool would then read the stalest of.
 */
const getCustomContentAttachmentId = (embeddableId: string) =>
  `${CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE}-${embeddableId}`;

export type CustomContentFetchContext = Partial<
  Pick<
    FetchContext,
    'timeRange' | 'esqlVariables' | 'filters' | 'query' | 'isApproximate' | 'projectRouting'
  >
>;

export interface BuildCustomContentContextAttachmentParams {
  template: string;
  embeddableId: string;
  esqlQuery?: string;
  panelTitle?: string;
  /** The panel's rendered height, so the preview starts at the size it had on the dashboard. */
  panelHeight?: number;
  fetchContext?: CustomContentFetchContext;
}

/** Dropped rather than rejected: an oversized field costs a faithful preview, not the attachment. */
const withinBudget = <T>(value: T | undefined): T | undefined =>
  value !== undefined && JSON.stringify(value).length <= MAX_FETCH_CONTEXT_BYTES
    ? value
    : undefined;

const buildSnapshotFetchContext = (fetchContext?: CustomContentFetchContext) => {
  const esqlVariables = fetchContext?.esqlVariables?.length
    ? withinBudget(fetchContext.esqlVariables)
    : undefined;
  const filters = fetchContext?.filters?.length
    ? withinBudget(fetchContext.filters as unknown as Array<Record<string, unknown>>)
    : undefined;
  const query = withinBudget(fetchContext?.query as unknown as Record<string, unknown>);

  return {
    ...(esqlVariables ? { esql_variables: esqlVariables } : {}),
    ...(filters ? { filters } : {}),
    ...(query ? { query } : {}),
    ...(fetchContext?.isApproximate ? { is_approximate: true } : {}),
    ...(fetchContext?.projectRouting ? { project_routing: fetchContext.projectRouting } : {}),
  };
};

export const buildCustomContentContextAttachment = ({
  template,
  embeddableId,
  esqlQuery,
  panelTitle,
  panelHeight,
  fetchContext,
}: BuildCustomContentContextAttachmentParams): AttachmentInput<
  typeof CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
  CustomContentContextAttachmentData
> => ({
  id: getCustomContentAttachmentId(embeddableId),
  type: CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
  data: {
    panel_template: template,
    esql_query: esqlQuery,
    // Truncated rather than left to fail validation
    panel_title: panelTitle?.slice(0, MAX_SHORT_FIELD_LENGTH),
    embeddable_id: embeddableId,
    ...(panelHeight ? { panel_height: panelHeight } : {}),
    ...(fetchContext?.timeRange ? { time_range: fetchContext.timeRange } : {}),
    ...buildSnapshotFetchContext(fetchContext),
  },
});
