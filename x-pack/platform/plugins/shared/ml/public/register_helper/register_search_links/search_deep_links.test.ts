/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDefaultMlCapabilities } from '@kbn/ml-common-types/capabilities';
import type { MlCapabilities } from '@kbn/ml-common-types/capabilities';
import { getDeepLinks } from './search_deep_links';

const fullCapabilities: MlCapabilities = {
  ...getDefaultMlCapabilities(),
  canUseAiops: true,
};

describe('getDeepLinks', () => {
  it('visible nav links include both globalSearch and sideNav', () => {
    const links = getDeepLinks(true, fullCapabilities, false);
    const anomalyDetection = links.find((l) => l.id === 'anomalyDetection');
    const dfa = links.find((l) => l.id === 'dataFrameAnalytics');
    const aiOps = links.find((l) => l.id === 'aiOps');

    expect(links.find((l) => l.id === 'overview')?.visibleIn).toEqual(['globalSearch', 'sideNav']);
    expect(links.find((l) => l.id === 'dataVisualizer')?.visibleIn).toEqual([
      'globalSearch',
      'sideNav',
    ]);
    expect(anomalyDetection?.deepLinks?.find((l) => l.id === 'anomalyExplorer')?.visibleIn).toEqual(
      ['globalSearch', 'sideNav']
    );
    expect(
      anomalyDetection?.deepLinks?.find((l) => l.id === 'singleMetricViewer')?.visibleIn
    ).toEqual(['globalSearch', 'sideNav']);
    expect(dfa?.deepLinks?.find((l) => l.id === 'resultExplorer')?.visibleIn).toEqual([
      'globalSearch',
      'sideNav',
    ]);
    expect(aiOps?.deepLinks?.find((l) => l.id === 'logRateAnalysis')?.visibleIn).toEqual([
      'globalSearch',
      'sideNav',
    ]);
  });

  it('hidden nav nodes (breadcrumb-only) use sideNav-only visibleIn', () => {
    const links = getDeepLinks(true, fullCapabilities, false);
    const aiOps = links.find((l) => l.id === 'aiOps');

    expect(links.find((l) => l.id === 'fileUpload')?.visibleIn).toEqual(['sideNav']);
    expect(links.find((l) => l.id === 'indexDataVisualizer')?.visibleIn).toEqual(['sideNav']);
    expect(links.find((l) => l.id === 'indexDataVisualizerPage')?.visibleIn).toEqual(['sideNav']);
    expect(links.find((l) => l.id === 'dataDrift')?.visibleIn).toEqual(['sideNav']);
    expect(links.find((l) => l.id === 'dataDriftPage')?.visibleIn).toEqual(['sideNav']);
    expect(aiOps?.deepLinks?.find((l) => l.id === 'logRateAnalysisPage')?.visibleIn).toEqual([
      'sideNav',
    ]);
    expect(aiOps?.deepLinks?.find((l) => l.id === 'logPatternAnalysisPage')?.visibleIn).toEqual([
      'sideNav',
    ]);
    expect(aiOps?.deepLinks?.find((l) => l.id === 'changePointDetectionsPage')?.visibleIn).toEqual([
      'sideNav',
    ]);
  });

  it('omits links when capabilities or license are insufficient', () => {
    expect(
      getDeepLinks(false, fullCapabilities, false).find((l) => l.id === 'overview')
    ).toBeUndefined();
    expect(
      getDeepLinks(true, { ...fullCapabilities, isADEnabled: false }, false).find(
        (l) => l.id === 'anomalyDetection'
      )
    ).toBeUndefined();
    expect(
      getDeepLinks(true, { ...fullCapabilities, canUseAiops: false }, false).find(
        (l) => l.id === 'aiOps'
      )
    ).toBeUndefined();
  });
});
