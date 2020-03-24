/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { wrapEsError } from '../wrap_es_error';

describe('wrap_es_error', () => {
  describe('#wrapEsError', () => {
    let originalError;
    beforeEach(() => {
      originalError = new Error('I am an error');
      originalError.statusCode = 404;
      originalError.response = '{}';
    });

    it('should return the correct object', () => {
      const wrappedError = wrapEsError(originalError);

      expect(wrappedError.statusCode).to.be(originalError.statusCode);
      expect(wrappedError.message).to.be(originalError.message);
    });

    it('should return the correct object with custom message', () => {
      const wrappedError = wrapEsError(originalError, { 404: 'No encontrado!' });

      expect(wrappedError.statusCode).to.be(originalError.statusCode);
      expect(wrappedError.message).to.be('No encontrado!');
    });
  });
});
