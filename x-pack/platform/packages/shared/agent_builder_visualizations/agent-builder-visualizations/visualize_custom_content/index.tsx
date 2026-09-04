/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { css } from '@emotion/react';
import type { TimeRange } from '@kbn/es-query';
import { CustomContentComponent } from '@kbn/custom-content-renderer';
import { CUSTOM_CONTENT_DEFAULT_HEIGHT } from '@kbn/custom-content-common';
import type { VisualizationServices } from '../services';

/**
 * Must be a flex column with a definite height, not just a height: the panel's own
 * root is `flex: 1 1 100%` and its iframe container `flex: 1 1 0%`, so in a block
 * parent both collapse to the container's min-height and the frame renders 200px
 * tall inside a correctly sized wrapper. A dashboard panel body is already a flex
 * container, which is why this only shows up in the conversation.
 */
const customContentContainerCss = (height: number) =>
  css({
    display: 'flex',
    flexDirection: 'column',
    height,
    minHeight: 0,
  });

export interface VisualizeCustomContentProps {
  services: VisualizationServices;
  /** The stored custom content payload: an HTML/Liquid template and its declared height. */
  visualization: Record<string, unknown> & { template?: string; height?: number };
  /** ES|QL query backing the template. Absent for static content. */
  esql?: string;
  timeRange?: TimeRange;
}

/**
 * Renders a custom content attachment inline in a conversation.
 *
 * The template is untrusted, LLM-authored markup: `CustomContentComponent` is what
 * makes it safe (DOMPurify, a `sandbox=""` iframe and a CSP meta tag), so this must
 * stay the only path a custom content payload reaches the DOM through.
 */
export const VisualizeCustomContent = ({
  services,
  visualization,
  esql,
  timeRange,
}: VisualizeCustomContentProps) => {
  // The panel reports its own loading state through a progress bar; inline in a
  // conversation there is no dashboard render-completion contract to satisfy.
  const onLoadingChange = useCallback(() => {}, []);

  const template = typeof visualization.template === 'string' ? visualization.template : undefined;
  // The chart default is tuned for a chart; custom content is whatever the model built,
  // so prefer the height it declared for this specific template.
  const height =
    typeof visualization.height === 'number' ? visualization.height : CUSTOM_CONTENT_DEFAULT_HEIGHT;

  return (
    <div css={customContentContainerCss(height)}>
      <CustomContentComponent
        services={services.customContent}
        // The conversation has no embeddable; the attachment is the identity here, and
        // the id only keys the fetch effect.
        embeddableId="agent-builder-custom-content"
        esqlQuery={esql}
        timeRange={timeRange}
        generationVersion={0}
        savedTemplate={template}
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
