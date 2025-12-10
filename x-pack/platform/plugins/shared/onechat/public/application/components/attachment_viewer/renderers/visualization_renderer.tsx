/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiCodeBlock } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { AttachmentContentProps } from '@kbn/onechat-browser/attachments';
import type { VisualizationAttachmentData } from '@kbn/onechat-common/attachments';
import type { CoreStart } from '@kbn/core/public';
import type { OnechatStartDependencies } from '../../../../types';
import { VisualizeLens } from '../../tools/esql/visualize_lens';

// Helper to check if an object is in Lens format (has visualizationType)
const isLensFormat = (obj: Record<string, unknown>): boolean => {
  return 'visualizationType' in obj;
};

// Helper to check if an object is in API format (has type and layers)
// This is the format LLM generates for visualizations
const isApiFormat = (obj: Record<string, unknown>): boolean => {
  return 'type' in obj && ('layers' in obj || 'breakdown' in obj || 'value' in obj);
};

// Helper to check if an object looks like a Lens configuration (internal format)
const isLensConfig = (obj: Record<string, unknown>): boolean => {
  // Lens configs typically have attributes or state properties
  return (
    'attributes' in obj ||
    'state' in obj ||
    ('visualizationType' in obj && 'references' in obj)
  );
};

// Helper to extract visualization data from attachment
// Handles multiple formats:
// 1. { visualization: {...}, esql?: string, ... } - structured format from UI promote
// 2. Direct Lens config object (with visualizationType) - internal Lens format
// 3. API format (with type, layers) - what LLM generates via attachment tools
const getVisualizationData = (data: unknown): VisualizationAttachmentData | null => {
  if (!data || typeof data !== 'object') {
    return null;
  }
  const d = data as Record<string, unknown>;

  // Check if data has a 'visualization' property (structured format from promote)
  if (d.visualization && typeof d.visualization === 'object') {
    return {
      visualization: d.visualization as Record<string, unknown>,
      chart_type: typeof d.chart_type === 'string' ? d.chart_type : undefined,
      esql: typeof d.esql === 'string' ? d.esql : undefined,
      description: typeof d.description === 'string' ? d.description : undefined,
    };
  }

  // Check if data itself is in API format (LLM-generated with type, layers, etc.)
  // This needs to be converted via LensConfigBuilder.fromAPIFormat()
  if (isApiFormat(d)) {
    // Try to extract ES|QL query from layers
    let esqlQuery: string | undefined;
    const layers = d.layers as Array<{ dataset?: { query?: string } }> | undefined;
    if (layers && layers[0]?.dataset?.query) {
      esqlQuery = layers[0].dataset.query;
    }

    return {
      visualization: d,
      chart_type: typeof d.type === 'string' ? d.type : undefined,
      esql: esqlQuery,
      description: typeof d.description === 'string' ? d.description : undefined,
    };
  }

  // Check if data is already in Lens format (has visualizationType)
  if (isLensFormat(d)) {
    return {
      visualization: d,
      chart_type: undefined,
      esql: undefined,
      description: undefined,
    };
  }

  // Check if data is a Lens config (legacy format with attributes/state)
  if (isLensConfig(d)) {
    return {
      visualization: d,
      chart_type: undefined,
      esql: undefined,
      description: undefined,
    };
  }

  return null;
};

/**
 * Fallback renderer that displays attachment data as formatted JSON.
 * Used when visualization cannot be rendered properly.
 */
const FallbackJsonRenderer: React.FC<{ data: unknown; message?: string }> = ({ data, message }) => {
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {message && (
        <EuiFlexItem grow={false}>
          <EuiText color="warning" size="s">
            {message}
          </EuiText>
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <EuiCodeBlock language="json" paddingSize="m" fontSize="s" isCopyable overflowHeight={400}>
          {JSON.stringify(data, null, 2)}
        </EuiCodeBlock>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

/**
 * Content renderer for visualization attachments.
 * Renders a Lens visualization using the stored configuration.
 * Falls back to displaying JSON if visualization cannot be rendered.
 */
export const VisualizationContentRenderer: React.FC<AttachmentContentProps> = ({ version }) => {
  const kibana = useKibana<CoreStart & { plugins: OnechatStartDependencies }>();
  const vizData = getVisualizationData(version.data);

  // If we can't parse the visualization data, show it as JSON fallback
  if (!vizData) {
    return (
      <FallbackJsonRenderer
        data={version.data}
        message="Could not parse visualization data. Displaying raw content:"
      />
    );
  }

  const { lens, dataViews, uiActions } = kibana.services.plugins || {};

  // If dependencies aren't available, show as JSON fallback
  if (!lens || !dataViews || !uiActions) {
    return (
      <FallbackJsonRenderer
        data={version.data}
        message="Visualization dependencies not available. Displaying raw content:"
      />
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {vizData.description && (
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            {vizData.description}
          </EuiText>
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <VisualizeLens
          lensConfig={vizData.visualization}
          lens={lens}
          dataViews={dataViews}
          uiActions={uiActions}
        />
      </EuiFlexItem>
      {vizData.esql && (
        <EuiFlexItem grow={false}>
          <EuiCodeBlock language="esql" paddingSize="s" fontSize="s" isCopyable>
            {vizData.esql}
          </EuiCodeBlock>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
