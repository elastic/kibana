/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sampleColor, MetricsExplorerColor, colorTransformer } from './color_palette';
describe('Color Palette', () => {
  describe('sampleColor()', () => {
    it('should just work', () => {
      const usedColors = [MetricsExplorerColor.color0];
      const color = sampleColor(usedColors);
      expect(color).toBe(MetricsExplorerColor.color1);
    });

    it('should return color0 when nothing is available', () => {
      const usedColors = [
        MetricsExplorerColor.color0,
        MetricsExplorerColor.color1,
        MetricsExplorerColor.color2,
        MetricsExplorerColor.color3,
        MetricsExplorerColor.color4,
        MetricsExplorerColor.color5,
        MetricsExplorerColor.color6,
        MetricsExplorerColor.color7,
        MetricsExplorerColor.color8,
        MetricsExplorerColor.color9,
      ];
      const color = sampleColor(usedColors);
      expect(color).toBe(MetricsExplorerColor.color0);
    });
  });
  describe('colorTransformer()', () => {
    it('should just work', () => {
      expect(colorTransformer(MetricsExplorerColor.color0)).toBe('#3185FC');
    });
  });
});
