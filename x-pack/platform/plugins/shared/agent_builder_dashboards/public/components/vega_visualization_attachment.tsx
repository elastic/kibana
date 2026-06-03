/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { useSearchApi } from '@kbn/presentation-publishing';
import { VISUALIZE_EMBEDDABLE_TYPE } from '@kbn/visualizations-common';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { ScreenContextAttachmentData } from '@kbn/agent-builder-common/attachments';
import type { VegaVisualizationAttachment } from '@kbn/agent-builder-dashboards-common';

const VEGA_INLINE_HEIGHT = 300;
const DEFAULT_TIME_RANGE = { from: 'now-24h', to: 'now' } as const;

const renderError = (message: string) => (
  <EuiCallOut
    title={i18n.translate('xpack.agentBuilderDashboards.vegaVisualization.error.title', {
      defaultMessage: 'Unable to render Vega visualization',
    })}
    color="danger"
    iconType="error"
    size="s"
    announceOnMount
  >
    <p>{message}</p>
  </EuiCallOut>
);

const VegaInline = ({
  attachment,
  screenContext,
}: {
  attachment: VegaVisualizationAttachment;
  screenContext?: ScreenContextAttachmentData;
}) => {
  const data = attachment.data;

  const serializedSpec = useMemo(() => {
    try {
      return JSON.stringify(data?.spec ?? {});
    } catch {
      return undefined;
    }
  }, [data]);

  // Inherit the conversation's screen context time range when present; otherwise
  // default to a 24h window so ES|QL queries that reference `?_tstart` / `?_tend`
  // have something to bind to. Conversation-side rendering does not expose a
  // time picker, so the agent should embed `?_tstart` / `?_tend` only when the
  // chart is meant to be placed on a dashboard.
  const timeRange = screenContext?.time_range ?? DEFAULT_TIME_RANGE;
  const searchApi = useSearchApi({ timeRange });

  if (!data || !serializedSpec) {
    return renderError(
      i18n.translate('xpack.agentBuilderDashboards.vegaVisualization.error.missingSpec', {
        defaultMessage: 'Attachment is missing a Vega spec.',
      })
    );
  }

  const title = data.title;

  return (
    <div
      data-test-subj="agentBuilderVegaVisualization"
      style={{ height: VEGA_INLINE_HEIGHT, width: '100%' }}
    >
      <EmbeddableRenderer
        type={VISUALIZE_EMBEDDABLE_TYPE}
        hidePanelChrome
        getParentApi={() => ({
          ...searchApi,
          getSerializedStateForChild: () => ({
            title,
            timeRange,
            // vis_type_vega registers a single 'vega' vis type that auto-detects
            // Vega vs Vega-Lite from the spec's $schema URL.
            savedVis: {
              title,
              type: 'vega',
              params: { spec: serializedSpec },
              data: { aggs: [], searchSource: {} },
            },
          }),
        })}
      />
    </div>
  );
};

export const vegaVisualizationAttachmentDefinition: AttachmentUIDefinition<VegaVisualizationAttachment> =
  {
    getLabel: (attachment) =>
      attachment.data?.title ||
      i18n.translate('xpack.agentBuilderDashboards.vegaVisualization.label', {
        defaultMessage: 'Vega visualization',
      }),
    getIcon: () => 'visVega',
    renderInlineContent: ({ attachment, screenContext }) => (
      <VegaInline attachment={attachment} screenContext={screenContext} />
    ),
  };
