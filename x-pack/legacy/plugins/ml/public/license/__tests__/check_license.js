/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import {
  xpackFeature,
} from '../check_license';

const initialInfo = {
  features: {
    watcher: {
      isAvailable: true
    }
  }
};

// const $injector = { get: () => ({}) };

describe('ML - check license', () => {

  describe('xpackFeatureProvider', () => {
    it('returns true for enabled feature', () => {
      const xpackFeatureService = xpackFeature(initialInfo);
      const result = xpackFeatureService.isAvailable('watcher');
      expect(result).to.be(true);
    });

    it('returns false for disabled feature', () => {
      const xpackFeatureService = xpackFeature(initialInfo);
      const result = xpackFeatureService.isAvailable('noSuchFeature');
      expect(result).to.be(false);
    });
  });
});
