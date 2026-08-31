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
import { i18n } from '@kbn/i18n';

export const WINDOW_OPTIONS = [
  {
    value: '5m',
    text: i18n.translate('xpack.alertingV2.sequenceBuilder.window5m', {
      defaultMessage: '5 minutes',
    }),
  },
  {
    value: '15m',
    text: i18n.translate('xpack.alertingV2.sequenceBuilder.window15m', {
      defaultMessage: '15 minutes',
    }),
  },
  {
    value: '1h',
    text: i18n.translate('xpack.alertingV2.sequenceBuilder.window1h', {
      defaultMessage: '1 hour',
    }),
  },
  {
    value: '6h',
    text: i18n.translate('xpack.alertingV2.sequenceBuilder.window6h', {
      defaultMessage: '6 hours',
    }),
  },
  {
    value: '24h',
    text: i18n.translate('xpack.alertingV2.sequenceBuilder.window24h', {
      defaultMessage: '24 hours',
    }),
  },
];

const windowLabel = (value: string | undefined) =>
  WINDOW_OPTIONS.find((o) => o.value === value)?.text ?? value;

export interface SequenceEdgeData extends Record<string, unknown> {
  window: string;
  onChange: (value: string) => void;
  isRowWrap?: boolean;
  closeAllTick?: number;
  interactive?: boolean;
}

export type SequenceEdgeType = Edge<SequenceEdgeData, 'sequenceHop'>;

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
    ? getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: 12,
      })
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
          {data?.interactive === false ? (
            <EuiBadge color="hollow" data-test-subj={`sequenceHopBadge-${id}`}>
              {i18n.translate('xpack.alertingV2.sequenceBuilder.withinWindow', {
                defaultMessage: 'within {window}',
                values: { window: windowLabel(data?.window) },
              })}
            </EuiBadge>
          ) : (
            <EuiPopover
              aria-label={i18n.translate('xpack.alertingV2.sequenceBuilder.hopWindowPopover', {
                defaultMessage: 'Edit hop window',
              })}
              button={
                <EuiBadge
                  color="hollow"
                  onClick={() => setIsOpen((open) => !open)}
                  onClickAriaLabel={i18n.translate(
                    'xpack.alertingV2.sequenceBuilder.editHopWindow',
                    {
                      defaultMessage: 'Edit time window: within {window}',
                      values: { window: windowLabel(data?.window) },
                    }
                  )}
                  data-test-subj={`sequenceHopBadge-${id}`}
                >
                  {i18n.translate('xpack.alertingV2.sequenceBuilder.withinWindow', {
                    defaultMessage: 'within {window}',
                    values: { window: windowLabel(data?.window) },
                  })}
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
                aria-label={i18n.translate('xpack.alertingV2.sequenceBuilder.hopWindowSelect', {
                  defaultMessage: 'Time window between steps',
                })}
                data-test-subj={`sequenceHopWindow-${id}`}
              />
            </EuiPopover>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
