/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiPanel, EuiSkeletonRectangle, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import React, { useCallback, useState } from 'react';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { useKiGraph } from '../../hooks/use_ki_graph';
import { useNavigation } from '../../hooks/use_navigation';
import { getAiIndexSettingsPath } from '../../paths';
import { AiIndexDetailPanelEmptyState } from '../ai_index_detail/ai_index_detail_panel_empty_prompt';
import { KiGraphCanvas } from './ki_graph_canvas';
import { KI_GRAPH_MAX_ROWS } from './build_ki_graph_query';
import { useKiGraphStyles } from './ki_graph_styles';
import { KiGraphViewerFlyout } from './ki_graph_viewer_flyout';
import type { KiGraphNodeData } from './types';

const errorTitle = i18n.translate('xpack.contextEngine.kiGraph.errorTitle', {
  defaultMessage: 'Unable to load the graph',
});

const retryLabel = i18n.translate('xpack.contextEngine.kiGraph.retry', {
  defaultMessage: 'Try again',
});

const emptyTitle = i18n.translate('xpack.contextEngine.kiGraph.emptyTitle', {
  defaultMessage: 'No facts or entities yet',
});

const emptyBody = i18n.translate('xpack.contextEngine.kiGraph.emptyBody', {
  defaultMessage:
    'Dreaming builds facts and entities from your Knowledge documents. They show up here after it runs. You can set it up in Settings.',
});

const emptySettingsAction = i18n.translate('xpack.contextEngine.kiGraph.emptySettingsAction', {
  defaultMessage: 'Open Settings',
});

const truncatedMessage = i18n.translate('xpack.contextEngine.kiGraph.truncated', {
  defaultMessage:
    'Showing the first {count} Knowledge documents, so parts of the graph may be missing.',
  values: { count: KI_GRAPH_MAX_ROWS },
});

interface KiGraphPanelProps {
  aiIndex: GetAiIndexResponse;
}

export const KiGraphPanel = ({ aiIndex }: KiGraphPanelProps) => {
  const { graph, isLoading, error, refetch } = useKiGraph(aiIndex);
  const { navigateToContextEngine } = useNavigation();
  const styles = useKiGraphStyles();
  const [selectedNode, setSelectedNode] = useState<KiGraphNodeData | undefined>();
  const [viewerNode, setViewerNode] = useState<KiGraphNodeData | undefined>();

  const openSettings = useCallback(() => {
    navigateToContextEngine(getAiIndexSettingsPath(aiIndex.id));
  }, [aiIndex.id, navigateToContextEngine]);

  const handleSelect = useCallback((node: KiGraphNodeData | undefined) => {
    setSelectedNode(node);
  }, []);

  const handleViewDocument = useCallback((node: KiGraphNodeData) => {
    setViewerNode(node);
  }, []);

  const handleCloseViewer = useCallback(() => {
    setViewerNode(undefined);
  }, []);

  if (isLoading && graph === undefined) {
    return (
      <EuiPanel
        hasBorder
        paddingSize="none"
        css={[styles.panel, styles.panelFill]}
        data-test-subj="contextKiGraphPanel"
      >
        <EuiSkeletonRectangle css={styles.skeleton} data-test-subj="contextKiGraphLoading" />
      </EuiPanel>
    );
  }

  if (error) {
    return (
      <EuiPanel hasBorder paddingSize="l" css={styles.panel} data-test-subj="contextKiGraphPanel">
        <KbnDangerCallout
          announceOnMount
          title={errorTitle}
          text={error.message}
          actionProps={{ primary: { children: retryLabel, onClick: () => refetch() } }}
          data-test-subj="contextKiGraphError"
        />
      </EuiPanel>
    );
  }

  if (graph === undefined || graph.nodes.length === 0) {
    return (
      <EuiPanel hasBorder paddingSize="l" css={styles.panel} data-test-subj="contextKiGraphPanel">
        <AiIndexDetailPanelEmptyState
          iconType="globe"
          dataTestSubj="contextKiGraphEmpty"
          message={
            <>
              <EuiText size="s" textAlign="center">
                <h3>{emptyTitle}</h3>
              </EuiText>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued" textAlign="center">
                {emptyBody}
              </EuiText>
            </>
          }
          action={
            <EuiButton fill size="s" onClick={openSettings}>
              {emptySettingsAction}
            </EuiButton>
          }
        />
      </EuiPanel>
    );
  }

  return (
    <EuiPanel
      hasBorder
      paddingSize="none"
      css={[styles.panel, styles.panelFill]}
      data-test-subj="contextKiGraphPanel"
    >
      {graph.truncated ? (
        <div css={styles.truncatedCallout}>
          <KbnWarningCallout
            announceOnMount
            size="s"
            title={truncatedMessage}
            data-test-subj="contextKiGraphTruncated"
          />
        </div>
      ) : null}
      <div css={styles.canvasShell}>
        <div css={styles.canvasInner}>
          <KiGraphCanvas
            aiIndexId={aiIndex.id}
            graph={graph}
            selectedId={selectedNode?.kiId}
            onSelect={handleSelect}
            onViewDocument={handleViewDocument}
          />
        </div>
      </div>
      {viewerNode ? (
        <KiGraphViewerFlyout aiIndexId={aiIndex.id} node={viewerNode} onClose={handleCloseViewer} />
      ) : null}
    </EuiPanel>
  );
};
