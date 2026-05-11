/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { JOB_MAP_NODE_TYPES } from '@kbn/ml-data-frame-analytics-utils';
import { JOB_MAP_INDEX_PATTERN_TYPE } from '../job_map_flow_constants';

/** Width and height of the SVG `viewBox` (and rendered size in px). */
export const GLYPH_VIEW_BOX_SIZE = 52;
/** Horizontal and vertical center of the viewBox (used for symmetric shapes). */
const VIEW_BOX_CENTER = GLYPH_VIEW_BOX_SIZE / 2;

/** Default analytics job circle — radius leaves room for stroke inside the viewBox. */
const GLYPH_CIRCLE_RADIUS = 21;

export interface JobMapShapeGlyphProps {
  nodeType: string;
  label: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  iconSrc?: string;
}

export const JobMapShapeGlyph = memo(
  ({ nodeType, label, fill, stroke, strokeWidth, iconSrc }: JobMapShapeGlyphProps) => {
    const common = {
      fill,
      stroke,
      strokeWidth,
      strokeLinejoin: 'round' as const,
      strokeLinecap: 'round' as const,
    };

    let body: React.ReactNode;
    switch (nodeType) {
      case JOB_MAP_NODE_TYPES.TRANSFORM:
        body = <rect x={6} y={6} width={40} height={40} {...common} />;
        break;
      case JOB_MAP_NODE_TYPES.INDEX:
      case JOB_MAP_INDEX_PATTERN_TYPE:
        body = (
          <polygon
            points={`${VIEW_BOX_CENTER},5 47,${VIEW_BOX_CENTER} ${VIEW_BOX_CENTER},47 5,${VIEW_BOX_CENTER}`}
            {...common}
          />
        );
        break;
      case JOB_MAP_NODE_TYPES.TRAINED_MODEL:
        body = <polygon points={`${VIEW_BOX_CENTER},5 47,47 5,47`} {...common} />;
        break;
      case JOB_MAP_NODE_TYPES.INGEST_PIPELINE:
        body = <rect x={6} y={10} width={40} height={32} rx={12} ry={12} {...common} />;
        break;
      case JOB_MAP_NODE_TYPES.ANALYTICS:
      case JOB_MAP_NODE_TYPES.ANALYTICS_JOB_MISSING:
      default:
        body = (
          <circle cx={VIEW_BOX_CENTER} cy={VIEW_BOX_CENTER} r={GLYPH_CIRCLE_RADIUS} {...common} />
        );
        break;
    }

    const iconSize = 16;
    const iconOffset = (GLYPH_VIEW_BOX_SIZE - iconSize) / 2;

    return (
      <svg
        width={GLYPH_VIEW_BOX_SIZE}
        height={GLYPH_VIEW_BOX_SIZE}
        viewBox={`0 0 ${GLYPH_VIEW_BOX_SIZE} ${GLYPH_VIEW_BOX_SIZE}`}
        role="img"
        aria-label={label}
      >
        {body}
        {iconSrc !== undefined ? (
          <image
            href={iconSrc}
            x={iconOffset}
            y={iconOffset}
            width={iconSize}
            height={iconSize}
            preserveAspectRatio="xMidYMid meet"
          />
        ) : null}
      </svg>
    );
  }
);

JobMapShapeGlyph.displayName = 'JobMapShapeGlyph';
