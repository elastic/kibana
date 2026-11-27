/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { KI_GRAPH_LABEL_MIN_ZOOM, KI_GRAPH_LOW_DETAIL_ZOOM } from './use_visible_label_ids';

export type KiGraphLabelTier = 'normal' | 'hub';
export type KiGraphDetailTier = 'full' | 'low';

export const getKiGraphLabelTier = (zoom: number): KiGraphLabelTier =>
  zoom >= KI_GRAPH_LABEL_MIN_ZOOM ? 'normal' : 'hub';

export const getKiGraphDetailTier = (zoom: number): KiGraphDetailTier =>
  zoom < KI_GRAPH_LOW_DETAIL_ZOOM ? 'low' : 'full';

// Zoom-dependent detail is toggled with CSS so crossing a threshold doesn't re-render every node and edge.
export const kiGraphZoomDetailCss = css`
  & [data-ki-graph-label] {
    display: none;
  }

  &[data-ki-graph-labels='normal'] [data-ki-graph-label][data-ki-graph-label-normal='true'],
  &[data-ki-graph-labels='hub'] [data-ki-graph-label][data-ki-graph-label-hub='true'],
  & [data-ki-graph-label][data-ki-graph-label-forced='true'] {
    display: block;
  }

  &[data-ki-graph-detail='low'] [data-ki-graph-node-icon] {
    display: none;
  }

  &[data-ki-graph-detail='low'] [data-ki-graph-edge-path] {
    marker-end: none;
  }
`;
