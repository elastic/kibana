/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { wrapCustomError } from '../wrap_custom_error';

describe('wrap_custom_error', () => {
  describe('#wrapCustomError', () => {
    it('should return a Boom object', () => {
      const originalError = new Error('I am an error');
      const statusCode = 404;
      const wrappedError = wrapCustomError(originalError, statusCode);

      expect(wrappedError.isBoom).to.be(true);
      expect(wrappedError.output.statusCode).to.equal(statusCode);
    });
  });
});
