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

    it('should return a Boom object', () => {
      const wrappedError = wrapEsError(originalError);

      expect(wrappedError.isBoom).to.be(true);
    });

    it('should return the correct Boom object', () => {
      const wrappedError = wrapEsError(originalError);

      expect(wrappedError.output.statusCode).to.be(originalError.statusCode);
      expect(wrappedError.output.payload.message).to.be(originalError.message);
    });

    it('should return the correct Boom object with custom message', () => {
      const wrappedError = wrapEsError(originalError, { 404: 'No encontrado!' });

      expect(wrappedError.output.statusCode).to.be(originalError.statusCode);
      expect(wrappedError.output.payload.message).to.be('No encontrado!');
    });
  });
});
