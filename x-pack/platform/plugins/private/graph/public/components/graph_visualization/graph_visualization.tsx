/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { ZoomEvent } from 'd3';
import d3 from 'd3';
import { css } from '@emotion/react';
import { type UseEuiTheme, euiTextTruncate, useEuiTheme } from '@elastic/eui';
import type {
  RuntimeGraph,
  WorkspaceNode,
  TermIntersect,
  ControlType,
  WorkspaceEdge,
} from '../../types';
import { makeNodeId } from '../../services/persistence';
import { getIconOffset, IconRenderer } from '../icon_renderer';
import { noUserSelectStyles } from '../../styles';
import {
  toggleEdgeSelection,
  toggleNodeSelection,
  type GraphDispatch,
  workspaceSelector,
} from '../../state_management';

export interface GraphVisualizationProps {
  runtimeGraph: RuntimeGraph;
  onSetControl: (control: ControlType) => void;
  selectSelected: (nodeId: string) => void;
  onSetMergeCandidates: (terms: TermIntersect[]) => void;
  getMergeCandidates?: (nodes: WorkspaceNode[]) => Promise<TermIntersect[]>;
  onToggleNodeSelection: (node: WorkspaceNode, replace: boolean) => boolean;
  onToggleEdgeSelection: (edge: WorkspaceEdge) => boolean;
  selectedNodeIds: readonly string[];
  selectedEdgeIds: readonly string[];
}

function registerZooming(element: SVGSVGElement) {
  const blockScroll = function () {
    (d3.event as Event).preventDefault();
  };
  d3.select(element)
    .on('mousewheel', blockScroll)
    .on('DOMMouseScroll', blockScroll)
    .call(
      d3.behavior.zoom().on('zoom', () => {
        const event = d3.event as ZoomEvent;
        d3.select(element)
          .select('g')
          .attr('transform', 'translate(' + event.translate + ')' + 'scale(' + event.scale + ')')
          .attr('style', 'stroke-width: ' + 1 / event.scale);
      })
    );
}

function makeEdgeId(edge: WorkspaceEdge) {
  return `${makeNodeId(edge.source.data.field, edge.source.data.term)}-${makeNodeId(
    edge.target.data.field,
    edge.target.data.term
  )}`;
}

export function GraphVisualization({
  runtimeGraph,
  selectSelected,
  onSetControl,
  onSetMergeCandidates,
  getMergeCandidates,
  onToggleNodeSelection,
  onToggleEdgeSelection,
  selectedNodeIds,
  selectedEdgeIds,
}: GraphVisualizationProps) {
  const svgRoot = useRef<SVGSVGElement | null>(null);

  const euiThemeContext = useEuiTheme();

  const nodeClick = (n: WorkspaceNode, event: React.MouseEvent) => {
    // Selection logic - shift key+click helps selects multiple nodes
    // Without the shift key we deselect all prior selections (perhaps not
    // a great idea for touch devices with no concept of shift key)
    if (onToggleNodeSelection(n, !event.shiftKey)) {
      selectSelected(n.id);
    } else {
      onSetControl('none');
    }
  };

  const handleMergeCandidatesCallback = (termIntersects: TermIntersect[]) => {
    const mergeCandidates: TermIntersect[] = [...termIntersects];
    onSetMergeCandidates(mergeCandidates);
    onSetControl('mergeTerms');
  };

  const edgeClick = async (edge: WorkspaceEdge) => {
    const isSelected = onToggleEdgeSelection(edge);
    onSetControl('edgeSelection');

    if (isSelected && getMergeCandidates) {
      handleMergeCandidatesCallback(await getMergeCandidates([edge.topSrc, edge.topTarget]));
    }
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="gphGraph"
      css={styles.graph}
      width="100%"
      height="100%"
      pointerEvents="all"
      id="graphSvg"
      ref={(element) => {
        if (element && svgRoot.current !== element) {
          svgRoot.current = element;
          registerZooming(element);
        }
      }}
    >
      <g>
        <g>
          {runtimeGraph.edges &&
            runtimeGraph.edges.map((edge) => (
              <g key={makeEdgeId(edge)} css={styles.edgeWrapper}>
                {/* Draw two edges: a thicker one for better click handling and the one to show the user */}
                <line
                  x1={edge.topSrc.kx}
                  y1={edge.topSrc.ky}
                  x2={edge.topTarget.kx}
                  y2={edge.topTarget.ky}
                  className="gphEdge"
                  strokeLinecap="round"
                  style={{ strokeWidth: edge.width }}
                  css={[
                    styles.edge(euiThemeContext),
                    // the stroke and stroke-opacity are overridden
                    selectedEdgeIds.includes(edge.id ?? makeEdgeId(edge)) &&
                      css`
                        stroke: ${euiThemeContext.euiTheme.colors.darkShade};
                        stroke-opacity: 0.95;
                      `,
                  ]}
                />
                <line
                  x1={edge.topSrc.kx}
                  y1={edge.topSrc.ky}
                  x2={edge.topTarget.kx}
                  y2={edge.topTarget.ky}
                  onClick={() => {
                    edgeClick(edge);
                  }}
                  className="gphEdge gphEdge--clickable"
                  data-test-subj="graphClickableEdge"
                  style={{ strokeWidth: Math.max(edge.width, 15) }}
                  css={[
                    styles.edge(euiThemeContext),
                    // fill is overridden
                    styles.edgeClickable,
                  ]}
                />
              </g>
            ))}
        </g>
        {runtimeGraph.nodes &&
          runtimeGraph.nodes
            .filter((node) => !node.parent)
            .map((node) => {
              const iconOffset = getIconOffset(node.icon);
              const kx = node.kx || 0;
              const ky = node.ky || 0;
              return (
                <g
                  key={makeNodeId(node.data.field, node.data.term)}
                  onClick={(e) => {
                    nodeClick(node, e);
                  }}
                  onMouseDown={(e) => {
                    // avoid selecting text when selecting nodes
                    if (e.ctrlKey || e.shiftKey) {
                      e.preventDefault();
                    }
                  }}
                  className="gphNode"
                  data-test-subj="graphNode"
                  data-node-id={node.id}
                  data-node-color={node.color}
                  css={css`
                    cursor: pointer;
                  `}
                >
                  <circle
                    cx={kx}
                    cy={ky}
                    r={node.scaledSize}
                    data-test-subj="graphNodeCircle"
                    css={[
                      css`
                        fill: ${node.color};
                      `,
                      selectedNodeIds.includes(node.id) &&
                        css`
                          stroke-width: ${euiThemeContext.euiTheme.size.xs};
                          stroke: ${euiThemeContext.euiTheme.colors.borderBasePrimary};
                          paint-order: stroke;
                        `,
                    ]}
                  />
                  <IconRenderer
                    icon={node.icon}
                    color={node.color}
                    x={kx - (iconOffset?.x || 0)}
                    y={ky - (iconOffset?.y || 0)}
                  />

                  {node.label.length < 30 && (
                    <text
                      className="gphNode__label"
                      css={[
                        svgTextStyles,
                        css`
                          cursor: pointer;
                        `,
                      ]}
                      textAnchor="middle"
                      transform="translate(0,22)"
                      x={kx}
                      y={ky}
                    >
                      {node.label}
                    </text>
                  )}
                  {node.label.length >= 30 && (
                    <foreignObject
                      width="100"
                      height="20"
                      transform="translate(-50,15)"
                      x={kx}
                      y={ky}
                    >
                      <p
                        className="gphNode__label"
                        css={[
                          svgTextStyles,
                          css`
                            cursor: pointer;
                            ${euiTextTruncate()};
                            text-align: center;
                          `,
                          noUserSelectStyles,
                        ]}
                      >
                        {node.label}
                      </p>
                    </foreignObject>
                  )}

                  {node.numChildren > 0 && (
                    <g>
                      <circle
                        r="5"
                        css={styles.nodeMarkerCircle}
                        transform="translate(10,10)"
                        cx={kx}
                        cy={ky}
                      />
                      <text
                        css={[
                          svgTextStyles,
                          css`
                            font-size: calc(${euiThemeContext.euiTheme.size.s} - 2px);
                            fill: ${euiThemeContext.euiTheme.colors.emptyShade};
                          `,
                        ]}
                        textAnchor="middle"
                        transform="translate(10,12)"
                        x={kx}
                        y={ky}
                      >
                        {node.numChildren}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
      </g>
    </svg>
  );
}

const svgTextStyles = ({ euiTheme }: UseEuiTheme) =>
  css({
    fontFamily: euiTheme.font.family,
    fontSize: euiTheme.size.s,
    lineHeight: euiTheme.size.m,
    fill: euiTheme.colors.darkShade,
    color: euiTheme.colors.darkShade,
  });

type ReduxGraphVisualizationProps = Omit<
  GraphVisualizationProps,
  'onToggleNodeSelection' | 'onToggleEdgeSelection' | 'selectedNodeIds' | 'selectedEdgeIds'
>;

export const ReduxGraphVisualization = (props: ReduxGraphVisualizationProps) => {
  const dispatch = useDispatch<GraphDispatch>();
  const { selectedEdgeIds, selectedNodeIds } = useSelector(workspaceSelector);

  return (
    <GraphVisualization
      {...props}
      selectedNodeIds={selectedNodeIds}
      selectedEdgeIds={selectedEdgeIds}
      onToggleNodeSelection={(node, replace) => {
        const isSelected = selectedNodeIds.includes(node.id);
        const willBeSelected = replace ? !isSelected || selectedNodeIds.length > 1 : !isSelected;
        dispatch(toggleNodeSelection({ nodeId: node.id, replace }));
        return willBeSelected;
      }}
      onToggleEdgeSelection={(edge) => {
        const edgeId = edge.id ?? makeEdgeId(edge);
        const willBeSelected = !selectedEdgeIds.includes(edgeId);
        dispatch(toggleEdgeSelection(edgeId));
        return willBeSelected;
      }}
    />
  );
};

const styles = {
  graph: css({
    flex: 1,
    overflow: 'hidden',
  }),

  edgeWrapper: css({
    '&:hover': {
      '.gphEdge': {
        strokeOpacity: 0.95,
        cursor: 'pointer',
      },
    },
  }),

  edge: ({ euiTheme }: UseEuiTheme) =>
    css({
      fill: euiTheme.colors.mediumShade,
      stroke: euiTheme.colors.mediumShade,
      strokeOpacity: 0.5,
      fontSize: `calc(${euiTheme.size.s} - 2px)`,
    }),

  edgeClickable: css({
    fill: 'transparent',
    opacity: 0,
  }),

  nodeMarkerCircle: ({ euiTheme }: UseEuiTheme) =>
    css({
      fill: euiTheme.colors.darkShade,
      stroke: euiTheme.colors.emptyShade,
    }),
};
