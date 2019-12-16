/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import events from 'events';
import expect from '@kbn/expect';
import sinon from 'sinon';
import proxyquire from 'proxyquire';
import { QueueMock } from './fixtures/queue';
import { ClientMock } from './fixtures/legacy_elasticsearch';
import { constants } from '../constants';

const createIndexMock = sinon.stub();
const { Job } = proxyquire.noPreserveCache()('../job', {
  './helpers/create_index': { createIndex: createIndexMock },
});

const maxPriority = 20;
const minPriority = -20;
const defaultPriority = 10;
const defaultCreatedBy = false;

function validateDoc(spy) {
  sinon.assert.callCount(spy, 1);
  const spyCall = spy.getCall(0);
  return spyCall.args[1];
}

describe('Job Class', function() {
  let mockQueue;
  let client;
  let index;

  let type;
  let payload;
  let options;

  beforeEach(function() {
    createIndexMock.resetHistory();
    createIndexMock.returns(Promise.resolve('mock'));
    index = 'test';

    client = new ClientMock();
    mockQueue = new QueueMock();
    mockQueue.setClient(client);
  });

  it('should be an event emitter', function() {
    const job = new Job(mockQueue, index, 'test', {});
    expect(job).to.be.an(events.EventEmitter);
  });

  describe('invalid construction', function() {
    it('should throw with a missing type', function() {
      const init = () => new Job(mockQueue, index);
      expect(init).to.throwException(/type.+string/i);
    });

    it('should throw with an invalid type', function() {
      const init = () => new Job(mockQueue, index, { 'not a string': true });
      expect(init).to.throwException(/type.+string/i);
    });

    it('should throw with an invalid payload', function() {
      const init = () => new Job(mockQueue, index, 'type1', [1, 2, 3]);
      expect(init).to.throwException(/plain.+object/i);
    });

    it(`should throw error if invalid maxAttempts`, function() {
      const init = () => new Job(mockQueue, index, 'type1', { id: '123' }, { max_attempts: -1 });
      expect(init).to.throwException(/invalid.+max_attempts/i);
    });
  });

  describe('construction', function() {
    let indexSpy;
    beforeEach(function() {
      type = 'type1';
      payload = { id: '123' };
      indexSpy = sinon.spy(client, 'callWithInternalUser').withArgs('index');
    });

    it('should create the target index', function() {
      const job = new Job(mockQueue, index, type, payload, options);
      return job.ready.then(() => {
        sinon.assert.calledOnce(createIndexMock);
        const args = createIndexMock.getCall(0).args;
        expect(args[0]).to.equal(client);
        expect(args[1]).to.equal(index);
      });
    });

    it('should index the payload', function() {
      const job = new Job(mockQueue, index, type, payload);
      return job.ready.then(() => {
        const indexArgs = validateDoc(indexSpy);
        expect(indexArgs).to.have.property('index', index);
        expect(indexArgs).to.have.property('body');
        expect(indexArgs.body).to.have.property('payload', payload);
      });
    });

    it('should index the job type', function() {
      const job = new Job(mockQueue, index, type, payload);
      return job.ready.then(() => {
        const indexArgs = validateDoc(indexSpy);
        expect(indexArgs).to.have.property('index', index);
        expect(indexArgs).to.have.property('body');
        expect(indexArgs.body).to.have.property('jobtype', type);
      });
    });

    it('should set event creation time', function() {
      const job = new Job(mockQueue, index, type, payload);
      return job.ready.then(() => {
        const indexArgs = validateDoc(indexSpy);
        expect(indexArgs.body).to.have.property('created_at');
      });
    });

    it('should refresh the index', function() {
      const refreshSpy = client.callWithInternalUser.withArgs('indices.refresh');

      const job = new Job(mockQueue, index, type, payload);
      return job.ready.then(() => {
        sinon.assert.calledOnce(refreshSpy);
        const spyCall = refreshSpy.getCall(0);
        expect(spyCall.args[1]).to.have.property('index', index);
      });
    });

    it('should emit the job information on success', function(done) {
      const job = new Job(mockQueue, index, type, payload);
      job.once(constants.EVENT_JOB_CREATED, jobDoc => {
        try {
          expect(jobDoc).to.have.property('id');
          expect(jobDoc).to.have.property('index');
          expect(jobDoc).to.have.property('_seq_no');
          expect(jobDoc).to.have.property('_primary_term');
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('should emit error on index creation failure', function(done) {
      const errMsg = 'test index creation failure';

      createIndexMock.returns(Promise.reject(new Error(errMsg)));
      const job = new Job(mockQueue, index, type, payload);

      job.once(constants.EVENT_JOB_CREATE_ERROR, err => {
        try {
          expect(err.message).to.equal(errMsg);
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('should emit error on client index failure', function(done) {
      const errMsg = 'test document index failure';

      client.callWithInternalUser.restore();
      sinon
        .stub(client, 'callWithInternalUser')
        .withArgs('index')
        .callsFake(() => Promise.reject(new Error(errMsg)));
      const job = new Job(mockQueue, index, type, payload);

      job.once(constants.EVENT_JOB_CREATE_ERROR, err => {
        try {
          expect(err.message).to.equal(errMsg);
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  });

  describe('event emitting', function() {
    it('should trigger events on the queue instance', function(done) {
      const eventName = 'test event';
      const payload1 = {
        test: true,
        deep: { object: 'ok' },
      };
      const payload2 = 'two';
      const payload3 = new Error('test error');

      const job = new Job(mockQueue, index, type, payload, options);

      mockQueue.on(eventName, (...args) => {
        try {
          expect(args[0]).to.equal(payload1);
          expect(args[1]).to.equal(payload2);
          expect(args[2]).to.equal(payload3);
          done();
        } catch (e) {
          done(e);
        }
      });

      job.emit(eventName, payload1, payload2, payload3);
    });
  });

  describe('default values', function() {
    let indexSpy;
    beforeEach(function() {
      type = 'type1';
      payload = { id: '123' };
      indexSpy = sinon.spy(client, 'callWithInternalUser').withArgs('index');
    });

    it('should set attempt count to 0', function() {
      const job = new Job(mockQueue, index, type, payload);
      return job.ready.then(() => {
        const indexArgs = validateDoc(indexSpy);
        expect(indexArgs.body).to.have.property('attempts', 0);
      });
    });

    it('should index default created_by value', function() {
      const job = new Job(mockQueue, index, type, payload);
      return job.ready.then(() => {
        const indexArgs = validateDoc(indexSpy);
        expect(indexArgs.body).to.have.property('created_by', defaultCreatedBy);
      });
    });

    it('should set an expired process_expiration time', function() {
      const now = new Date().getTime();
      const job = new Job(mockQueue, index, type, payload);
      return job.ready.then(() => {
        const indexArgs = validateDoc(indexSpy);
        expect(indexArgs.body).to.have.property('process_expiration');
        expect(indexArgs.body.process_expiration.getTime()).to.be.lessThan(now);
      });
    });

    it('should set status as pending', function() {
      const job = new Job(mockQueue, index, type, payload);
      return job.ready.then(() => {
        const indexArgs = validateDoc(indexSpy);
        expect(indexArgs.body).to.have.property('status', constants.JOB_STATUS_PENDING);
      });
    });

    it('should have a default priority of 10', function() {
      const job = new Job(mockQueue, index, type, payload, options);
      return job.ready.then(() => {
        const indexArgs = validateDoc(indexSpy);
        expect(indexArgs.body).to.have.property('priority', defaultPriority);
      });
    });

    it('should set a browser type', function() {
      const job = new Job(mockQueue, index, type, payload);
      return job.ready.then(() => {
        const indexArgs = validateDoc(indexSpy);
        expect(indexArgs.body).to.have.property('browser_type');
      });
    });
  });

  describe('option passing', function() {
    let indexSpy;
    beforeEach(function() {
      type = 'type1';
      payload = { id: '123' };
      options = {
        timeout: 4567,
        max_attempts: 9,
        headers: {
          authorization: 'Basic cXdlcnR5',
        },
      };
      indexSpy = sinon.spy(client, 'callWithInternalUser').withArgs('index');
    });

    it('should index the created_by value', function() {
      const createdBy = 'user_identifier';
      const job = new Job(mockQueue, index, type, payload, {
        created_by: createdBy,
        ...options,
      });
      return job.ready.then(() => {
        const indexArgs = validateDoc(indexSpy);
        expect(indexArgs.body).to.have.property('created_by', createdBy);
      });
    });

    it('should index timeout value from options', function() {
      const job = new Job(mockQueue, index, type, payload, options);
      return job.ready.then(() => {
        const indexArgs = validateDoc(indexSpy);
        expect(indexArgs.body).to.have.property('timeout', options.timeout);
      });
    });

    it('should set max attempt count', function() {
      const job = new Job(mockQueue, index, type, payload, options);
      return job.ready.then(() => {
        const indexArgs = validateDoc(indexSpy);
        expect(indexArgs.body).to.have.property('max_attempts', options.max_attempts);
      });
    });

    it('should add headers to the request params', function() {
      const job = new Job(mockQueue, index, type, payload, options);
      return job.ready.then(() => {
        const indexArgs = validateDoc(indexSpy);
        expect(indexArgs).to.have.property('headers', options.headers);
      });
    });

    it(`should use upper priority of ${maxPriority}`, function() {
      const job = new Job(mockQueue, index, type, payload, { priority: maxPriority * 2 });
      return job.ready.then(() => {
        const indexArgs = validateDoc(indexSpy);
        expect(indexArgs.body).to.have.property('priority', maxPriority);
      });
    });

    it(`should use lower priority of ${minPriority}`, function() {
      const job = new Job(mockQueue, index, type, payload, { priority: minPriority * 2 });
      return job.ready.then(() => {
        const indexArgs = validateDoc(indexSpy);
        expect(indexArgs.body).to.have.property('priority', minPriority);
      });
    });
  });

  describe('get method', function() {
    beforeEach(function() {
      type = 'type2';
      payload = { id: '123' };
    });

    it('should return the job document', function() {
      const job = new Job(mockQueue, index, type, payload);

      return job.get().then(doc => {
        const jobDoc = job.document; // document should be resolved
        expect(doc).to.have.property('index', index);
        expect(doc).to.have.property('id', jobDoc.id);
        expect(doc).to.have.property('_seq_no', jobDoc._seq_no);
        expect(doc).to.have.property('_primary_term', jobDoc._primary_term);
        expect(doc).to.have.property('created_by', defaultCreatedBy);

        expect(doc).to.have.property('payload');
        expect(doc).to.have.property('jobtype');
        expect(doc).to.have.property('priority');
        expect(doc).to.have.property('timeout');
      });
    });

    it('should contain optional data', function() {
      const optionals = {
        created_by: 'some_ident',
      };

      const job = new Job(mockQueue, index, type, payload, optionals);
      return Promise.resolve(client.callWithInternalUser('get', {}, optionals))
        .then(doc => {
          sinon
            .stub(client, 'callWithInternalUser')
            .withArgs('get')
            .returns(Promise.resolve(doc));
        })
        .then(() => {
          return job.get().then(doc => {
            expect(doc).to.have.property('created_by', optionals.created_by);
          });
        });
    });
  });

  describe('toJSON method', function() {
    beforeEach(function() {
      type = 'type2';
      payload = { id: '123' };
      options = {
        timeout: 4567,
        max_attempts: 9,
        priority: 8,
      };
    });

    it('should return the static information about the job', function() {
      const job = new Job(mockQueue, index, type, payload, options);

      // toJSON is sync, should work before doc is written to elasticsearch
      expect(job.document).to.be(undefined);

      const doc = job.toJSON();
      expect(doc).to.have.property('index', index);
      expect(doc).to.have.property('jobtype', type);
      expect(doc).to.have.property('created_by', defaultCreatedBy);
      expect(doc).to.have.property('timeout', options.timeout);
      expect(doc).to.have.property('max_attempts', options.max_attempts);
      expect(doc).to.have.property('priority', options.priority);
      expect(doc).to.have.property('id');
      expect(doc).to.not.have.property('version');
    });

    it('should contain optional data', function() {
      const optionals = {
        created_by: 'some_ident',
      };

      const job = new Job(mockQueue, index, type, payload, optionals);
      const doc = job.toJSON();
      expect(doc).to.have.property('created_by', optionals.created_by);
    });
  });
});
