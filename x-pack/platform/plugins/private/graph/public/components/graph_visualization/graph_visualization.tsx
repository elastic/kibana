/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import classNames from 'classnames';
import d3, { ZoomEvent } from 'd3';
import { css } from '@emotion/react';
import { UseEuiTheme, euiTextTruncate, useEuiTheme } from '@elastic/eui';
import { Workspace, WorkspaceNode, TermIntersect, ControlType, WorkspaceEdge } from '../../types';
import { makeNodeId } from '../../services/persistence';
import { getIconOffset, IconRenderer } from '../icon_renderer';
import { noUserSelectStyles } from '../../styles';

export interface GraphVisualizationProps {
  workspace: Workspace;
  onSetControl: (control: ControlType) => void;
  selectSelected: (node: WorkspaceNode) => void;
  onSetMergeCandidates: (terms: TermIntersect[]) => void;
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
  workspace,
  selectSelected,
  onSetControl,
  onSetMergeCandidates,
}: GraphVisualizationProps) {
  const svgRoot = useRef<SVGSVGElement | null>(null);

  const euiThemeContext = useEuiTheme();

  const nodeClick = (n: WorkspaceNode, event: React.MouseEvent) => {
    // Selection logic - shift key+click helps selects multiple nodes
    // Without the shift key we deselect all prior selections (perhaps not
    // a great idea for touch devices with no concept of shift key)
    if (!event.shiftKey) {
      const prevSelection = n.isSelected;
      workspace.selectNone();
      n.isSelected = prevSelection;
    }
    if (workspace.toggleNodeSelection(n)) {
      selectSelected(n);
    } else {
      onSetControl('none');
    }
    workspace.changeHandler();
  };

  const handleMergeCandidatesCallback = (termIntersects: TermIntersect[]) => {
    const mergeCandidates: TermIntersect[] = [...termIntersects];
    onSetMergeCandidates(mergeCandidates);
    onSetControl('mergeTerms');
  };

  const edgeClick = (edge: WorkspaceEdge) => {
    // no multiple selection for now
    const currentSelection = workspace.getEdgeSelection();
    if (currentSelection.length && currentSelection[0] !== edge) {
      workspace.clearEdgeSelection();
    }
    if (!edge.isSelected) {
      workspace.addEdgeToSelection(edge);
    } else {
      workspace.removeEdgeFromSelection(edge);
    }
    onSetControl('edgeSelection');

    if (edge.isSelected) {
      workspace.getAllIntersections(handleMergeCandidatesCallback, [edge.topSrc, edge.topTarget]);
    }
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      // TODO: className gphGraph is used on test, remove class and update snapchot
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
          {workspace.edges &&
            workspace.edges.map((edge) => (
              // TODO: Delete gphEdge--wrapper and update snapshots
              <g key={makeEdgeId(edge)} className="gphEdge--wrapper" css={styles.edgeWrapper}>
                {/* Draw two edges: a thicker one for better click handling and the one to show the user */}
                <line
                  x1={edge.topSrc.kx}
                  y1={edge.topSrc.ky}
                  x2={edge.topTarget.kx}
                  y2={edge.topTarget.ky}
                  // NOTE: className gphEdge is used in tests and for applying hover styles
                  className="gphEdge"
                  strokeLinecap="round"
                  css={[
                    styles.edge(euiThemeContext, edge.width),
                    edge.isSelected &&
                      css({
                        stroke: euiThemeContext.euiTheme.colors.darkShade,
                        strokeOpacity: 0.95,
                      }),
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
                  // className gphEdge is used in tests
                  className="gphEdge gphEdge--clickable"
                  css={[
                    styles.edge(euiThemeContext, Math.max(edge.width, 15)),
                    styles.edgeClickable,
                  ]}
                />
              </g>
            ))}
        </g>
        {workspace.nodes &&
          workspace.nodes
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
                  // className gphNode is used in tests
                  className="gphNode"
                  css={css({ cursor: 'pointer' })}
                >
                  <circle
                    cx={kx}
                    cy={ky}
                    r={node.scaledSize}
                    // TODO: Update snapshots
                    className={classNames('gphNode__circle', {
                      'gphNode__circle--selected': node.isSelected,
                    })}
                    css={[
                      css({ fill: node.color }),
                      node.isSelected &&
                        css({
                          strokeWidth: euiThemeContext.euiTheme.size.xs,
                          stroke: `transparentize(${euiThemeContext.euiTheme.colors.primary}, .25)`,
                        }),
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
                      // TODO: delete class
                      className="gphNode__label"
                      css={[svgTextStyles, css({ cursor: 'pointer' })]}
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
                        // TODO: Delete class
                        className="gphNode__markerCircle"
                        css={styles.nodeMarkerCircle}
                        transform="translate(10,10)"
                        cx={kx}
                        cy={ky}
                      />
                      <text
                        // TODO: Delete class
                        className="gphNode__markerText"
                        css={[
                          svgTextStyles,
                          css({
                            fontSize: `calc(${euiThemeContext.euiTheme.size.s} - 2px)`,
                            fill: euiThemeContext.euiTheme.colors.emptyShade,
                          }),
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

const styles = {
  graph: css({
    flex: 1,
    overflow: 'hidden',
  }),
  edgeWrapper: css({
    '&:hover .gphEdge': {
      strokeOpacity: 0.95,
      cursor: 'pointer',
    },
  }),
  edge: ({ euiTheme }: UseEuiTheme, edgeWidth = 2) =>
    css({
      fill: euiTheme.colors.mediumShade,
      stroke: euiTheme.colors.mediumShade,
      strokeWidth: edgeWidth,
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
