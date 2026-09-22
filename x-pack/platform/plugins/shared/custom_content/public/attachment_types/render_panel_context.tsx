/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { AggregateQuery, Filter, Query } from '@kbn/es-query';
import { css } from '@emotion/react';
import {
  CustomContentComponent,
  type CustomContentRendererServices,
} from '@kbn/custom-content-renderer';
import {
  MAX_PREVIEW_HEIGHT,
  type CustomContentContextAttachmentData,
} from '../../common/panel_context_attachment';
import { getServices } from '../services';

/** Used when the attachment predates the captured height, or the panel was never measured. */
const FALLBACK_HEIGHT = 320;
/** Matches the renderer's own iframe-container floor. */
const MIN_HEIGHT = 200;

export const resolvePreviewHeight = (panelHeight?: number): number =>
  Math.min(MAX_PREVIEW_HEIGHT, Math.max(MIN_HEIGHT, panelHeight ?? FALLBACK_HEIGHT));

const containerCss = (height: number) =>
  css({
    display: 'flex',
    flexDirection: 'column',
    height,
    minHeight: 0,
    width: '100%',
  });

/**
 * Renders a panel-context attachment inline in the conversation.
 *
 * This is a snapshot of a dashboard panel the user sent to chat, so it renders
 * read-only: the live panel keeps the unified-search context, and the Preview
 * action is what applies a version back to it.
 */
export const RenderPanelContext = ({ data }: { data: CustomContentContextAttachmentData }) => {
  // Do not render an empty panel: "Generate with chat" on an empty panel pushes a blank template.
  const hasTemplate = Boolean(data.panel_template?.trim());
  const { core, search } = getServices();

  const services = useMemo<CustomContentRendererServices>(
    () => ({ http: core.http, uiSettings: core.uiSettings, search }),
    [core, search]
  );

  // The conversation has no render-completion contract to satisfy.
  const onLoadingChange = useCallback(() => {}, []);

  const height = resolvePreviewHeight(data.panel_height);

  if (!hasTemplate) {
    return null;
  }

  return (
    <div css={containerCss(height)}>
      <CustomContentComponent
        services={services}
        embeddableId={data.embeddable_id}
        esqlQuery={data.esql_query}
        // The range captured when the panel was sent to chat, so the preview matches what
        // the user was looking at. Older attachments have none and render unranged.
        timeRange={data.time_range}
        generationVersion={0}
        savedTemplate={data.panel_template}
        isApproximate={Boolean(data.is_approximate)}
        projectRouting={data.project_routing}
        query={data.query as Query | AggregateQuery | undefined}
        filters={data.filters as Filter[] | undefined}
        esqlVariables={data.esql_variables}
        previewHtml={null}
        onLoadingChange={onLoadingChange}
      />
    </div>
  );
};
