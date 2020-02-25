/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { missingImage } from '../../common/lib/missing_asset';
import { resolveFromArgs, resolveWithMissingImage } from './resolve_dataurl';

describe('resolve_dataurl', () => {
  describe('resolveFromArgs', () => {
    it('finds and returns the dataurl from args successfully', () => {
      const args = {
        name: 'dataurl',
        argType: 'imageUpload',
        dataurl: [missingImage, 'test2'],
      };
      expect(resolveFromArgs(args)).toBe(missingImage);
    });
    it('finds and returns null for invalid dataurl', () => {
      const args = {
        name: 'dataurl',
        argType: 'imageUpload',
        dataurl: ['invalid url', 'test2'],
      };
      expect(resolveFromArgs(args)).toBe(null);
    });
  });

  describe('resolveWithMissingImage', () => {
    it('returns valid dataurl', () => {
      expect(resolveWithMissingImage(missingImage)).toBe(missingImage);
    });
    it('returns missingImage for invalid dataurl', () => {
      expect(resolveWithMissingImage('invalid dataurl')).toBe(missingImage);
    });
    it('returns null for null dataurl', () => {
      expect(resolveWithMissingImage(null)).toBe(null);
    });
  });
});
