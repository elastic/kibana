/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractLayer } from './layer';

describe('layer', () => {
  const layer = new AbstractLayer({ layerDescriptor: {} });

  describe('updateDueToExtent', () => {
    it('should be false when the source is not extent aware', async () => {
      const sourceMock = {
        isFilterByMapBounds: () => {
          return false;
        },
      };
      const updateDueToExtent = layer.updateDueToExtent(sourceMock);
      expect(updateDueToExtent).toBe(false);
    });

    it('should be false when buffers are the same', async () => {
      const sourceMock = {
        isFilterByMapBounds: () => {
          return true;
        },
      };
      const oldBuffer = {
        maxLat: 12.5,
        maxLon: 102.5,
        minLat: 2.5,
        minLon: 92.5,
      };
      const newBuffer = {
        maxLat: 12.5,
        maxLon: 102.5,
        minLat: 2.5,
        minLon: 92.5,
      };
      const updateDueToExtent = layer.updateDueToExtent(
        sourceMock,
        { buffer: oldBuffer },
        { buffer: newBuffer }
      );
      expect(updateDueToExtent).toBe(false);
    });

    it('should be false when the new buffer is contained in the old buffer', async () => {
      const sourceMock = {
        isFilterByMapBounds: () => {
          return true;
        },
      };
      const oldBuffer = {
        maxLat: 12.5,
        maxLon: 102.5,
        minLat: 2.5,
        minLon: 92.5,
      };
      const newBuffer = {
        maxLat: 10,
        maxLon: 100,
        minLat: 5,
        minLon: 95,
      };
      const updateDueToExtent = layer.updateDueToExtent(
        sourceMock,
        { buffer: oldBuffer },
        { buffer: newBuffer }
      );
      expect(updateDueToExtent).toBe(false);
    });

    it('should be true when the new buffer is contained in the old buffer and the past results were truncated', async () => {
      const sourceMock = {
        isFilterByMapBounds: () => {
          return true;
        },
      };
      const oldBuffer = {
        maxLat: 12.5,
        maxLon: 102.5,
        minLat: 2.5,
        minLon: 92.5,
      };
      const newBuffer = {
        maxLat: 10,
        maxLon: 100,
        minLat: 5,
        minLon: 95,
      };
      const updateDueToExtent = layer.updateDueToExtent(
        sourceMock,
        { buffer: oldBuffer, areResultsTrimmed: true },
        { buffer: newBuffer }
      );
      expect(updateDueToExtent).toBe(true);
    });

    it('should be true when meta has no old buffer', async () => {
      const sourceMock = {
        isFilterByMapBounds: () => {
          return true;
        },
      };
      const updateDueToExtent = layer.updateDueToExtent(sourceMock);
      expect(updateDueToExtent).toBe(true);
    });

    it('should be true when the new buffer is not contained in the old buffer', async () => {
      const sourceMock = {
        isFilterByMapBounds: () => {
          return true;
        },
      };
      const oldBuffer = {
        maxLat: 12.5,
        maxLon: 102.5,
        minLat: 2.5,
        minLon: 92.5,
      };
      const newBuffer = {
        maxLat: 7.5,
        maxLon: 92.5,
        minLat: -2.5,
        minLon: 82.5,
      };
      const updateDueToExtent = layer.updateDueToExtent(
        sourceMock,
        { buffer: oldBuffer },
        { buffer: newBuffer }
      );
      expect(updateDueToExtent).toBe(true);
    });
  });
});
