/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import expect from '@kbn/expect';
import {
  isSecurityDisabled
} from '../security_utils';

describe('ML - security utils', () => {

  function mockServerFactory(isAvailable = true, isEnabled = true) {
    return {
      plugins: {
        xpack_main: {
          info: {
            isAvailable: () => isAvailable,
            feature: () => ({
              isEnabled: () => isEnabled
            })
          }
        }
      }
    };
  }

  describe('isSecurityDisabled', () => {

    it('returns not disabled for given mock server object #1', () => {
      expect(isSecurityDisabled(mockServerFactory())).to.be(false);
    });

    it('returns not disabled for given mock server object #2', () => {
      expect(isSecurityDisabled(mockServerFactory(false))).to.be(false);
    });

    it('returns disabled for given mock server object #3', () => {
      expect(isSecurityDisabled(mockServerFactory(true, false))).to.be(true);
    });

  });

});
