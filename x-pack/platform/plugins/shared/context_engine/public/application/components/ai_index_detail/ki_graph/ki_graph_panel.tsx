/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiLoadingChart,
  EuiText,
  EuiToolTip,
  euiPaletteColorBlind,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnDangerCallout } from '@kbn/ui-callout';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GetAiIndexResponse } from '../../../../../common/http_api/ai_indices';
import { useKiGraph } from '../../../hooks/use_ki_graph';
import { KI_GRAPH_MAX_KIS } from '../../../utils/ki_graph';
import { KiGraphCanvas } from './ki_graph_canvas';
import { kiGraphLayerLabel } from './ki_graph_labels';
import { KiGraphNodeFlyout } from './ki_graph_node_flyout';
import type { KiGraphSceneColors } from './ki_graph_scene';

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const spinLabel = i18n.translate('xpack.contextEngine.kiGraph.spin', {
  defaultMessage: 'Rotate the graph',
});
const pauseLabel = i18n.translate('xpack.contextEngine.kiGraph.pause', {
  defaultMessage: 'Pause the rotation',
});
const resetLabel = i18n.translate('xpack.contextEngine.kiGraph.reset', {
  defaultMessage: 'Whole map',
});

interface KiGraphPanelProps {
  aiIndex: GetAiIndexResponse;
  /** Share of the graph's width covered on the left by content drawn over it. */
  leftInsetRatio?: number;
}

/**
 * The AI index's KIs as an explorable 3D graph that fills its container, with transparent
 * background so it can sit behind other content. Click a bubble to read it.
 */
export const KiGraphPanel = ({ aiIndex, leftInsetRatio = 0 }: KiGraphPanelProps) => {
  const { euiTheme } = useEuiTheme();
  const { graph, isLoading, error } = useKiGraph({
    aiIndexId: aiIndex.id,
    dest: aiIndex.dest.value,
  });
  const [hiddenGroups, setHiddenGroups] = useState<Set<string>>(() => new Set());
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [spin, setSpin] = useState(() => !prefersReducedMotion());
  const [resetToken, setResetToken] = useState(0);
  const [focusInset, setFocusInset] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);

  const groupColors = useMemo(() => {
    const layers = graph?.layers ?? [];
    const palette = euiPaletteColorBlind({ rotations: Math.ceil(layers.length / 10) || 1 });
    return new Map(
      layers.map(({ group }, position) => [group, palette[position % palette.length]])
    );
  }, [graph]);

  const colors = useMemo<KiGraphSceneColors>(
    () => ({
      background: euiTheme.colors.backgroundBasePlain,
      text: euiTheme.colors.textParagraph,
      accent: euiTheme.colors.primary,
      groups: groupColors,
    }),
    [euiTheme, groupColors]
  );

  const selectedNode = useMemo(
    () => (selectedId ? graph?.nodes.find(({ id }) => id === selectedId) : undefined),
    [graph, selectedId]
  );

  const toggleGroup = useCallback((group: string) => {
    setHiddenGroups((current) => {
      const next = new Set(current);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  }, []);

  const onSelect = useCallback(
    (id: string | undefined) => {
      const node = id ? graph?.nodes.find((entry) => entry.id === id) : undefined;
      setSelectedId(node && !hiddenGroups.has(node.group) ? node.id : undefined);
    },
    [graph, hiddenGroups]
  );

  // The selection is framed in the part of the stage its flyout leaves visible.
  useEffect(() => {
    if (!selectedId) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      const flyout = window.document.querySelector('[data-test-subj="contextKiGraphNodeFlyout"]');
      const stage = stageRef.current;
      setFocusInset(
        flyout && stage
          ? Math.max(0, stage.getBoundingClientRect().right - flyout.getBoundingClientRect().left)
          : 0
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedId]);

  useEffect(() => {
    if (selectedNode && hiddenGroups.has(selectedNode.group)) {
      setSelectedId(undefined);
    }
  }, [hiddenGroups, selectedNode]);

  const rootCss = css`
    position: relative;
    width: 100%;
    height: 100%;
  `;
  // The controls float over the right of the graph, clear of content drawn over its left.
  const toolbarCss = css`
    position: absolute;
    top: 0;
    right: 0;
    max-width: 50%;
  `;
  const hintCss = css`
    position: absolute;
    right: ${euiTheme.size.s};
    bottom: ${euiTheme.size.s};
    pointer-events: none;
  `;
  const centeredCss = css`
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding-left: ${leftInsetRatio * 100}%;
  `;

  if (error) {
    return (
      <div css={rootCss}>
        <div css={toolbarCss}>
          <KbnDangerCallout
            size="s"
            announceOnMount
            title={i18n.translate('xpack.contextEngine.kiGraph.loadError', {
              defaultMessage: 'Unable to load the graph',
            })}
            text={error.message}
            data-test-subj="contextKiGraphError"
          />
        </div>
      </div>
    );
  }

  if (isLoading || !graph) {
    return (
      <div css={rootCss}>
        <div css={centeredCss} data-test-subj="contextKiGraphLoading">
          <EuiFlexGroup direction="column" alignItems="center" gutterSize="s">
            <EuiLoadingChart size="xl" />
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.contextEngine.kiGraph.loading"
                defaultMessage="Drawing the map…"
              />
            </EuiText>
          </EuiFlexGroup>
        </div>
      </div>
    );
  }

  if (graph.nodes.length === 0) {
    return null;
  }

  return (
    <div css={rootCss} ref={stageRef} data-test-subj="contextKiGraphPanel">
      <KiGraphCanvas
        graph={graph}
        colors={colors}
        hiddenGroups={hiddenGroups}
        selectedId={selectedId}
        spin={spin}
        focusInset={focusInset}
        leftInsetRatio={leftInsetRatio}
        resetToken={resetToken}
        onSelect={onSelect}
      />
      <div css={toolbarCss}>
        <EuiFlexGroup
          gutterSize="xs"
          alignItems="center"
          justifyContent="flexEnd"
          wrap
          responsive={false}
          role="group"
          aria-label={i18n.translate('xpack.contextEngine.kiGraph.layers', {
            defaultMessage: 'Show or hide layers',
          })}
        >
          {graph.layers.map(({ group, count }) => {
            const visible = !hiddenGroups.has(group);
            return (
              <EuiFlexItem grow={false} key={group}>
                <EuiButtonEmpty
                  size="xs"
                  color="text"
                  aria-pressed={visible}
                  onClick={() => toggleGroup(group)}
                  data-test-subj={`contextKiGraphLayer-${group}`}
                >
                  <EuiHealth
                    color={visible ? groupColors.get(group) ?? 'subdued' : 'subdued'}
                    textSize="xs"
                  >
                    <EuiText size="xs" color={visible ? 'default' : 'subdued'}>
                      {kiGraphLayerLabel(group)} {count}
                    </EuiText>
                  </EuiHealth>
                </EuiButtonEmpty>
              </EuiFlexItem>
            );
          })}
          <EuiFlexItem grow={false}>
            <EuiToolTip content={spin ? pauseLabel : spinLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType={spin ? 'pause' : 'play'}
                size="xs"
                aria-label={spin ? pauseLabel : spinLabel}
                aria-pressed={spin}
                onClick={() => setSpin((current) => !current)}
                data-test-subj="contextKiGraphSpin"
              />
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={resetLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="home"
                size="xs"
                aria-label={resetLabel}
                onClick={() => {
                  setSelectedId(undefined);
                  setResetToken((token) => token + 1);
                }}
                data-test-subj="contextKiGraphReset"
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
        {graph.truncated && (
          <EuiText size="xs" color="subdued" textAlign="right">
            <FormattedMessage
              id="xpack.contextEngine.kiGraph.truncated"
              defaultMessage="Showing the first {max} Knowledge Indicators."
              values={{ max: KI_GRAPH_MAX_KIS }}
            />
          </EuiText>
        )}
      </div>
      <EuiText size="xs" color="subdued" css={hintCss}>
        <FormattedMessage
          id="xpack.contextEngine.kiGraph.hint"
          defaultMessage="Drag to orbit · scroll to zoom · click a bubble to open it"
        />
      </EuiText>
      {selectedNode && (
        <KiGraphNodeFlyout
          aiIndexId={aiIndex.id}
          node={selectedNode}
          graph={graph}
          groupColors={groupColors}
          onSelect={onSelect}
          onClose={() => setSelectedId(undefined)}
        />
      )}
    </div>
  );
};
