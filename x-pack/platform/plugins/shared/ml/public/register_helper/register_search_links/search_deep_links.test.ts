/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDefaultCapabilities as getDefaultMlCapabilities } from '../../../common/types/capabilities';
import type { MlCapabilities } from '../../../common/types/capabilities';
import { getDeepLinks } from './search_deep_links';

const fullCapabilities: MlCapabilities = {
  ...getDefaultMlCapabilities(),
  canUseAiops: true,
};

describe('getDeepLinks', () => {
  it('primary visible nav links include globalSearch and projectSideNav', () => {
    const links = getDeepLinks(true, fullCapabilities, false);
    expect(links.find((l) => l.id === 'overview')?.visibleIn).toEqual([
      'globalSearch',
      'projectSideNav',
    ]);
  });

  it('file upload / index data visualizer / data drift remain in globalSearch + projectSideNav', () => {
    const links = getDeepLinks(true, fullCapabilities, false);

    expect(links.find((l) => l.id === 'fileUpload')?.visibleIn).toEqual([
      'globalSearch',
      'projectSideNav',
    ]);
    expect(links.find((l) => l.id === 'indexDataVisualizer')?.visibleIn).toEqual([
      'globalSearch',
      'projectSideNav',
    ]);
    expect(links.find((l) => l.id === 'dataDrift')?.visibleIn).toEqual([
      'globalSearch',
      'projectSideNav',
    ]);
  });

  it('breadcrumb-only *Page variants are hidden everywhere (visibleIn: [])', () => {
    const links = getDeepLinks(true, fullCapabilities, false);
    const aiOps = links.find((l) => l.id === 'aiOps');

    expect(links.find((l) => l.id === 'indexDataVisualizerPage')?.visibleIn).toEqual([]);
    expect(links.find((l) => l.id === 'dataDriftPage')?.visibleIn).toEqual([]);
    expect(aiOps?.deepLinks?.find((l) => l.id === 'logRateAnalysisPage')?.visibleIn).toEqual([]);
    expect(aiOps?.deepLinks?.find((l) => l.id === 'logPatternAnalysisPage')?.visibleIn).toEqual([]);
    expect(aiOps?.deepLinks?.find((l) => l.id === 'changePointDetectionsPage')?.visibleIn).toEqual(
      []
    );
  });
});
