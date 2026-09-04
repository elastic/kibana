/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import {
  CustomContentComponent,
  type CustomContentRendererServices,
} from '@kbn/custom-content-renderer';
import { CUSTOM_CONTENT_DEFAULT_HEIGHT } from '@kbn/custom-content-common';
import type { CustomContentContextAttachmentData } from '../../common/panel_context_attachment';
import { getServices } from '../services';

/**
 * Flex column with a definite height: the panel's own root is `flex: 1 1 100%`
 * and its iframe container `flex: 1 1 0%`, so a plain block parent collapses both
 * to the container's min-height regardless of the height set on the wrapper.
 */
const containerCss = css({
  display: 'flex',
  flexDirection: 'column',
  height: CUSTOM_CONTENT_DEFAULT_HEIGHT,
  minHeight: 0,
  width: '100%',
});

/**
 * Renders a panel-context attachment inline in the conversation.
 *
 * This is a snapshot of a dashboard panel the user sent to chat, so it renders
 * read-only: the live panel keeps the unified-search context, and the Preview
 * action is what applies a version back to it. Rendering the version being viewed
 * is what makes stepping through the history legible — without it the card shows
 * only a title, and the user has to apply a version to the dashboard to see it.
 */
export const RenderPanelContext = ({ data }: { data: CustomContentContextAttachmentData }) => {
  const { core, search } = getServices();

  const services = useMemo<CustomContentRendererServices>(
    () => ({ http: core.http, uiSettings: core.uiSettings, search }),
    [core, search]
  );

  // The conversation has no render-completion contract to satisfy.
  const onLoadingChange = useCallback(() => {}, []);

  return (
    <div css={containerCss}>
      <CustomContentComponent
        services={services}
        embeddableId={data.embeddable_id}
        esqlQuery={data.esql_query}
        // The range captured when the panel was sent to chat, so the preview matches what
        // the user was looking at. Older attachments have none and render unranged.
        timeRange={data.time_range}
        generationVersion={0}
        savedTemplate={data.panel_template}
        isApproximate={false}
        projectRouting={undefined}
        query={undefined}
        filters={undefined}
        esqlVariables={undefined}
        previewHtml={null}
        onLoadingChange={onLoadingChange}
      />
    </div>
  );
};
