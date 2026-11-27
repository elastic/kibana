/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getKiGraphDetailTier, getKiGraphLabelTier } from './ki_graph_zoom_styles';
import { KI_GRAPH_LABEL_MIN_ZOOM, KI_GRAPH_LOW_DETAIL_ZOOM } from './use_visible_label_ids';

describe('getKiGraphLabelTier', () => {
  it('shows hub labels below the label zoom threshold', () => {
    expect(getKiGraphLabelTier(KI_GRAPH_LABEL_MIN_ZOOM - 0.01)).toBe('hub');
  });

  it('shows normal labels at and above the label zoom threshold', () => {
    expect(getKiGraphLabelTier(KI_GRAPH_LABEL_MIN_ZOOM)).toBe('normal');
    expect(getKiGraphLabelTier(2)).toBe('normal');
  });
});

describe('getKiGraphDetailTier', () => {
  it('uses low detail below the detail zoom threshold', () => {
    expect(getKiGraphDetailTier(KI_GRAPH_LOW_DETAIL_ZOOM - 0.01)).toBe('low');
  });

  it('uses full detail at and above the detail zoom threshold', () => {
    expect(getKiGraphDetailTier(KI_GRAPH_LOW_DETAIL_ZOOM)).toBe('full');
    expect(getKiGraphDetailTier(2)).toBe('full');
  });
});
