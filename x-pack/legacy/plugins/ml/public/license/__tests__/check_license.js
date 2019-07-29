/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { xpackInfo } from '../../../../xpack_main/public/services/xpack_info';
import {
  xpackFeatureAvailable,
} from '../check_license';

const initialInfo = {
  features: {
    watcher: {
      isAvailable: true
    }
  }
};

describe('ML - check license', () => {
  describe('xpackFeatureProvider', () => {
    beforeEach(() => {
      xpackInfo.setAll(initialInfo);
    });

    it('returns true for enabled feature', () => {
      const result = xpackFeatureAvailable('watcher');
      expect(result).to.be(true);
    });

    it('returns false for disabled feature', () => {
      const result = xpackFeatureAvailable('noSuchFeature');
      expect(result).to.be(false);
    });
  });
});
