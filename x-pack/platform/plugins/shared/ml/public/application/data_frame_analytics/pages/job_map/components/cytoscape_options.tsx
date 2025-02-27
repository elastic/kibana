/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type cytoscape from 'cytoscape';

import { useEuiFontSize, useEuiTheme, type EuiThemeComputed } from '@elastic/eui';

import { ANALYSIS_CONFIG_TYPE, JOB_MAP_NODE_TYPES } from '@kbn/ml-data-frame-analytics-utils';

import classificationJobIcon from './icons/ml_classification_job.svg';
import outlierDetectionJobIcon from './icons/ml_outlier_detection_job.svg';
import regressionJobIcon from './icons/ml_regression_job.svg';

const MAP_SHAPES = {
  ELLIPSE: 'ellipse',
  RECTANGLE: 'rectangle',
  DIAMOND: 'diamond',
  TRIANGLE: 'triangle',
  ROUND_RECTANGLE: 'round-rectangle',
} as const;
type MapShapes = (typeof MAP_SHAPES)[keyof typeof MAP_SHAPES];

function shapeForNode(el: cytoscape.NodeSingular): MapShapes {
  const type = el.data('type');
  switch (type) {
    case JOB_MAP_NODE_TYPES.ANALYTICS:
      return MAP_SHAPES.ELLIPSE;
    case JOB_MAP_NODE_TYPES.ANALYTICS_JOB_MISSING:
      return MAP_SHAPES.ELLIPSE;
    case JOB_MAP_NODE_TYPES.TRANSFORM:
      return MAP_SHAPES.RECTANGLE;
    case JOB_MAP_NODE_TYPES.INDEX:
      return MAP_SHAPES.DIAMOND;
    case JOB_MAP_NODE_TYPES.TRAINED_MODEL:
      return MAP_SHAPES.TRIANGLE;
    case JOB_MAP_NODE_TYPES.INGEST_PIPELINE:
      return MAP_SHAPES.ROUND_RECTANGLE;

    default:
      return MAP_SHAPES.ELLIPSE;
  }
}

function iconForNode(el: cytoscape.NodeSingular) {
  const type = el.data('analysisType');

  switch (type) {
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

function borderColorForNode(el: cytoscape.NodeSingular, euiTheme: EuiThemeComputed) {
  if (el.selected()) {
    return euiTheme.colors.primary;
  }

  const type = el.data('type');

  switch (type) {
    case JOB_MAP_NODE_TYPES.ANALYTICS_JOB_MISSING:
      return euiTheme.colors.fullShade;
    case JOB_MAP_NODE_TYPES.ANALYTICS:
      // Amsterdam + Borealis
      return euiTheme.colors.vis.euiColorVis0;
    case JOB_MAP_NODE_TYPES.TRANSFORM:
      // Amsterdam: euiTheme.colors.vis.euiColorVis1
      // Borealis:  euiTheme.colors.vis.euiColorVis2
      return euiTheme.flags.hasVisColorAdjustment
        ? euiTheme.colors.vis.euiColorVis1
        : euiTheme.colors.vis.euiColorVis2;
    case JOB_MAP_NODE_TYPES.INDEX:
      // Amsterdam: euiTheme.colors.vis.euiColorVis2
      // Borealis:  euiTheme.colors.vis.euiColorVis4
      return euiTheme.flags.hasVisColorAdjustment
        ? euiTheme.colors.vis.euiColorVis2
        : euiTheme.colors.vis.euiColorVis4;
    case JOB_MAP_NODE_TYPES.TRAINED_MODEL:
      // Amsterdam: euiTheme.colors.vis.euiColorVis3
      // Borealis:  euiTheme.colors.vis.euiColorVis5
      return euiTheme.flags.hasVisColorAdjustment
        ? euiTheme.colors.vis.euiColorVis3
        : euiTheme.colors.vis.euiColorVis5;
    case JOB_MAP_NODE_TYPES.INGEST_PIPELINE:
      // Amsterdam: euiTheme.colors.vis.euiColorVis7
      // Borealis:  euiTheme.colors.vis.euiColorVis8
      return euiTheme.flags.hasVisColorAdjustment
        ? euiTheme.colors.vis.euiColorVis7
        : euiTheme.colors.vis.euiColorVis8;

    default:
      return euiTheme.colors.mediumShade;
  }
}

export const useCytoscapeOptions = (): cytoscape.CytoscapeOptions => {
  const { euiTheme } = useEuiTheme();
  const euiFontSizeXS = useEuiFontSize('xs', { unit: 'px' }).fontSize as string;

  return useMemo(
    () => ({
      autoungrabify: true,
      boxSelectionEnabled: false,
      maxZoom: 3,
      minZoom: 0.2,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (el: cytoscape.NodeSingular) =>
              el.data('isRoot') ? euiTheme.colors.warning : euiTheme.colors.ghost,
            'background-height': '60%',
            'background-width': '60%',
            'border-color': (el: cytoscape.NodeSingular) => borderColorForNode(el, euiTheme),
            'border-style': 'solid',
            // @ts-ignore
            'background-image': (el: cytoscape.NodeSingular) => iconForNode(el),
            'border-width': (el: cytoscape.NodeSingular) => (el.selected() ? 4 : 3),
            color: euiTheme.colors.textParagraph,
            'font-family': 'Inter UI, Segoe UI, Helvetica, Arial, sans-serif',
            'font-size': euiFontSizeXS,
            'min-zoomed-font-size': parseInt(euiTheme.size.l, 10),
            label: 'data(label)',
            shape: (el: cytoscape.NodeSingular) => shapeForNode(el),
            'text-background-color': euiTheme.colors.lightestShade,
            'text-background-opacity': 0,
            'text-background-padding': euiTheme.size.xs,
            'text-background-shape': 'roundrectangle',
            'text-margin-y': parseInt(euiTheme.size.s, 10),
            'text-max-width': '200px',
            'text-valign': 'bottom',
            'text-wrap': 'wrap',
          },
        },
        {
          selector: 'edge',
          style: {
            'curve-style': 'taxi',
            // @ts-ignore
            'taxi-direction': 'rightward',
            'line-color': euiTheme.colors.lightShade,
            'overlay-opacity': 0,
            'target-arrow-color': euiTheme.colors.lightShade,
            'target-arrow-shape': 'triangle',
            // @ts-ignore
            'target-distance-from-node': euiTheme.size.xs,
            width: 1,
            'source-arrow-shape': 'none',
          },
        },
      ],
    }),
    [euiFontSizeXS, euiTheme]
  );
};
