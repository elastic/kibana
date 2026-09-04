/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { TimeRange } from '@kbn/es-query';
import { CustomContentComponent } from '@kbn/custom-content-renderer';
import type { VisualizationServices } from '../services';
import { visualizationEmbeddableStyles } from '../shared/styles';
import { DEFAULT_VISUALIZATION_HEIGHT } from '../shared/get_visualization_dimensions';

export interface VisualizeCustomContentProps {
  services: VisualizationServices;
  /** The stored custom content payload: an HTML/Liquid template. */
  visualization: Record<string, unknown> & { template?: string };
  /** ES|QL query backing the template. Absent for static content. */
  esql?: string;
  timeRange?: TimeRange;
  height?: number;
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
  height = DEFAULT_VISUALIZATION_HEIGHT,
}: VisualizeCustomContentProps) => {
  // The panel reports its own loading state through a progress bar; inline in a
  // conversation there is no dashboard render-completion contract to satisfy.
  const onLoadingChange = useCallback(() => {}, []);

  const template = typeof visualization.template === 'string' ? visualization.template : undefined;

  return (
    <div css={visualizationEmbeddableStyles(height)}>
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
