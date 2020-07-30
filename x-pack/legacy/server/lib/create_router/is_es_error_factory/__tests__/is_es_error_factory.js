/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { isEsErrorFactory } from '../is_es_error_factory';
import { set } from '@elastic/safer-lodash-set';

class MockAbstractEsError {}

describe('is_es_error_factory', () => {
  let mockServer;
  let isEsError;

  beforeEach(() => {
    const mockEsErrors = {
      _Abstract: MockAbstractEsError,
    };
    mockServer = {};
    set(mockServer, 'plugins.elasticsearch.getCluster', () => ({ errors: mockEsErrors }));

    isEsError = isEsErrorFactory(mockServer);
  });

  describe('#isEsErrorFactory', () => {
    it('should return a function', () => {
      expect(isEsError).to.be.a(Function);
    });

    describe('returned function', () => {
      it('should return true if passed-in err is a known esError', () => {
        const knownEsError = new MockAbstractEsError();
        expect(isEsError(knownEsError)).to.be(true);
      });

      it('should return false if passed-in err is not a known esError', () => {
        const unknownEsError = {};
        expect(isEsError(unknownEsError)).to.be(false);
      });
    });
  });
});
