/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import expect from '@kbn/expect';
import {
  xpackFeature,
} from '../check_license';

// todo fix this
function Private() {
  return {
    get(str) {
      if (str === 'features.watcher.isAvailable') {
        return true;
      } else {
        return false;
      }
    }
  };
}

describe('ML - check license', () => {

  describe('xpackFeatureProvider', () => {
    it('returns true for enabled feature', () => {
      const xpackFeatureService = xpackFeature($http);
      const result = xpackFeatureService.isAvailable('watcher');
      expect(result).to.be(true);
    });

    it('returns false for disabled feature', () => {
      const xpackFeatureService = xpackFeature($http);
      const result = xpackFeatureService.isAvailable('noSuchFeature');
      expect(result).to.be(false);
    });
  });
});
