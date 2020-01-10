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

    it('should return invalid permissions message for 403 errors', () => {
      const securityError = new Error('I am an error');
      securityError.statusCode = 403;
      const wrappedError = wrapEsError(securityError);

      expect(wrappedError.isBoom).to.be(true);
      expect(wrappedError.message).to.be(
        'Insufficient user permissions for managing Logstash pipelines'
      );
    });
  });
});
