/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import type { Node } from '@xyflow/react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useEuiFontSize, useEuiTheme, type EuiThemeComputed } from '@elastic/eui';
import { ANALYSIS_CONFIG_TYPE, JOB_MAP_NODE_TYPES } from '@kbn/ml-data-frame-analytics-utils';

import type { JOB_MAP_FLOW_NODE_TYPE } from '../map_elements_to_flow';
import { type JobMapNodeData } from '../map_elements_to_flow';
import {
  JOB_MAP_INDEX_PATTERN_TYPE,
  JOB_MAP_NODE_HEIGHT,
  JOB_MAP_NODE_WIDTH,
} from '../job_map_flow_constants';

import classificationJobIcon from './icons/ml_classification_job.svg';
import outlierDetectionJobIcon from './icons/ml_outlier_detection_job.svg';
import regressionJobIcon from './icons/ml_regression_job.svg';
import { GLYPH_VIEW_BOX_SIZE, JobMapShapeGlyph } from './job_map_shape_glyph';

type JobMapFlowNodeType = Node<JobMapNodeData, typeof JOB_MAP_FLOW_NODE_TYPE>;

/** Vertical band that holds handles + glyph so edges meet the shape, not the label block. */
const SHAPE_ROW_HEIGHT = GLYPH_VIEW_BOX_SIZE + 20;

function iconSrcForAnalysisType(analysisType?: string): string | undefined {
  switch (analysisType) {
    case ANALYSIS_CONFIG_TYPE.OUTLIER_DETECTION:
      return outlierDetectionJobIcon;
    case ANALYSIS_CONFIG_TYPE.CLASSIFICATION:
      return classificationJobIcon;
    case ANALYSIS_CONFIG_TYPE.REGRESSION:
      return regressionJobIcon;
    default:
      return undefined;
  }
}

function borderColorForType(
  type: string,
  selected: boolean,
  colors: EuiThemeComputed['colors']
): string {
  if (selected) {
    return colors.primary;
  }
  switch (type) {
    case JOB_MAP_NODE_TYPES.ANALYTICS_JOB_MISSING:
      return colors.fullShade;
    case JOB_MAP_NODE_TYPES.ANALYTICS:
      return colors.vis.euiColorVis0;
    case JOB_MAP_NODE_TYPES.TRANSFORM:
      return colors.vis.euiColorVis2;
    case JOB_MAP_NODE_TYPES.INDEX:
    case JOB_MAP_INDEX_PATTERN_TYPE:
      return colors.vis.euiColorVis4;
    case JOB_MAP_NODE_TYPES.TRAINED_MODEL:
      return colors.vis.euiColorVis5;
    case JOB_MAP_NODE_TYPES.INGEST_PIPELINE:
      return colors.vis.euiColorVis8;
    default:
      return colors.mediumShade;
  }
}

export const JobMapFlowNode = memo(({ data, selected }: NodeProps<JobMapFlowNodeType>) => {
  const { euiTheme } = useEuiTheme();
  const fontSizeXs = useEuiFontSize('xs', { unit: 'px' }).fontSize as string;
  const borderColor = borderColorForType(data.type, selected, euiTheme.colors);
  const fill = data.isRoot ? euiTheme.colors.warning : euiTheme.colors.plainLight;
  const strokeWidth = selected ? 4 : 3;
  const iconSrc = iconSrcForAnalysisType(data.analysisType);

  const handleCss = css`
    z-index: ${Number(euiTheme.levels.content) + 1};
    width: 6px;
    height: 6px;
    min-width: 6px;
    min-height: 6px;
    border: none;
    background: transparent;
  `;

  return (
    <div
      css={css`
        width: ${JOB_MAP_NODE_WIDTH}px;
        min-height: ${JOB_MAP_NODE_HEIGHT}px;
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
      `}
    >
      <div
        css={css`
          width: 100%;
          height: ${SHAPE_ROW_HEIGHT}px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        `}
      >
        {/*
          Handles must sit on the glyph's left/right, not the full 200px card —
          otherwise edges terminate in empty margin and look disconnected.
        */}
        <div
          css={css`
            position: relative;
            width: ${GLYPH_VIEW_BOX_SIZE}px;
            height: ${GLYPH_VIEW_BOX_SIZE}px;
            flex-shrink: 0;
          `}
        >
          <Handle type="target" position={Position.Left} css={handleCss} />
          <Handle type="source" position={Position.Right} css={handleCss} />
          <JobMapShapeGlyph
            nodeType={data.type}
            label={data.label}
            fill={fill}
            stroke={borderColor}
            strokeWidth={strokeWidth}
            iconSrc={iconSrc}
          />
        </div>
      </div>
      <div
        css={css`
          color: ${euiTheme.colors.textParagraph};
          font-family: ${euiTheme.font.family};
          font-size: ${fontSizeXs};
          line-height: ${euiTheme.font.lineHeightMultiplier};
          text-align: center;
          max-width: ${JOB_MAP_NODE_WIDTH}px;
          word-break: break-word;
          padding: 0 ${euiTheme.size.xs} ${euiTheme.size.s};
        `}
      >
        {data.label}
      </div>
    </div>
  );
});

JobMapFlowNode.displayName = 'JobMapFlowNode';
