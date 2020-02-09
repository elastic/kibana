/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { WorkerTimeoutError, UnspecifiedWorkerError } from '../../helpers/errors';

describe('custom errors', function() {
  describe('WorkerTimeoutError', function() {
    it('should be function', () => {
      expect(WorkerTimeoutError).to.be.a('function');
    });

    it('should have a name', function() {
      const err = new WorkerTimeoutError('timeout error');
      expect(err).to.have.property('name', 'WorkerTimeoutError');
    });

    it('should take a jobId property', function() {
      const err = new WorkerTimeoutError('timeout error', { jobId: 'il7hl34rqlo8ro' });
      expect(err).to.have.property('jobId', 'il7hl34rqlo8ro');
    });

    it('should take a timeout property', function() {
      const err = new WorkerTimeoutError('timeout error', { timeout: 15000 });
      expect(err).to.have.property('timeout', 15000);
    });

    it('should be stringifyable', function() {
      const err = new WorkerTimeoutError('timeout error');
      expect(`${err}`).to.equal('WorkerTimeoutError: timeout error');
    });
  });

  describe('UnspecifiedWorkerError', function() {
    it('should be function', () => {
      expect(UnspecifiedWorkerError).to.be.a('function');
    });

    it('should have a name', function() {
      const err = new UnspecifiedWorkerError('unspecified error');
      expect(err).to.have.property('name', 'UnspecifiedWorkerError');
    });

    it('should take a jobId property', function() {
      const err = new UnspecifiedWorkerError('unspecified error', { jobId: 'il7hl34rqlo8ro' });
      expect(err).to.have.property('jobId', 'il7hl34rqlo8ro');
    });

    it('should be stringifyable', function() {
      const err = new UnspecifiedWorkerError('unspecified error');
      expect(`${err}`).to.equal('UnspecifiedWorkerError: unspecified error');
    });
  });
});
