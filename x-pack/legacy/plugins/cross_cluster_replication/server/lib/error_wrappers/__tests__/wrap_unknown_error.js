/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { wrapUnknownError } from '../wrap_unknown_error';

describe('wrap_unknown_error', () => {
  describe('#wrapUnknownError', () => {
    it('should return a Boom object', () => {
      const originalError = new Error('I am an error');
      const wrappedError = wrapUnknownError(originalError);

      expect(wrappedError.isBoom).to.be(true);
    });
  });
});
