/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiBadge, EuiPopover, EuiSelect } from '@elastic/eui';
import type { Edge, EdgeProps } from '@xyflow/react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, getSmoothStepPath } from '@xyflow/react';
import { WINDOW_OPTIONS } from './window_options';

export interface SequenceEdgeData extends Record<string, unknown> {
  window: string;
  onChange: (value: string) => void;
  /** Row-wrap connector (last stage of one row -> first stage of the next) —
   * rendered as an elbow/step path instead of a flat bezier. */
  isRowWrap?: boolean;
  /** Bumped whenever the canvas is clicked elsewhere; edges close their own
   * popover in response instead of relying on document-level outside-click
   * detection, which the React Flow pane's own pointer handling swallows. */
  closeAllTick?: number;
}

export type SequenceEdgeType = Edge<SequenceEdgeData, 'sequenceHop'>;

const windowLabel = (value: string | undefined) =>
  WINDOW_OPTIONS.find((o) => o.value === value)?.text ?? value;

/**
 * Each hop between two stages has its own independently configurable time
 * window — not one global window for the whole sequence. Collapsed to a
 * small badge (rather than an always-open control) so it stays legible as
 * more relationship types (AND/OR, entity matching) get added here later.
 */
export const SequenceEdge: React.FC<EdgeProps<SequenceEdgeType>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [data?.closeAllTick]);

  const [edgePath, labelX, labelY] = data?.isRowWrap
    ? getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 12 })
    : getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
        >
          <EuiPopover
            button={
              <EuiBadge
                color="hollow"
                onClick={() => setIsOpen((open) => !open)}
                onClickAriaLabel={`Edit time window: within ${windowLabel(data?.window)}`}
                data-test-subj={`sequenceHopBadge-${id}`}
              >
                within {windowLabel(data?.window)}
              </EuiBadge>
            }
            isOpen={isOpen}
            closePopover={() => setIsOpen(false)}
            panelPaddingSize="s"
            anchorPosition="upCenter"
          >
            <EuiSelect
              compressed
              options={WINDOW_OPTIONS}
              value={data?.window}
              onChange={(e) => data?.onChange(e.target.value)}
              data-test-subj={`sequenceHopWindow-${id}`}
            />
          </EuiPopover>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
