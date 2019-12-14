/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import events from 'events';
import expect from '@kbn/expect';
import sinon from 'sinon';
import proxyquire from 'proxyquire';
import { noop, times } from 'lodash';
import { constants } from '../constants';
import { ClientMock } from './fixtures/legacy_elasticsearch';
import { JobMock } from './fixtures/job';
import { WorkerMock } from './fixtures/worker';

const { Esqueue } = proxyquire.noPreserveCache()('../index', {
  './job': { Job: JobMock },
  './worker': { Worker: WorkerMock },
});

describe('Esqueue class', function() {
  let client;

  beforeEach(function() {
    client = new ClientMock();
  });

  it('should be an event emitter', function() {
    const queue = new Esqueue('esqueue', { client });
    expect(queue).to.be.an(events.EventEmitter);
  });

  describe('Option validation', function() {
    it('should throw without an index', function() {
      const init = () => new Esqueue();
      expect(init).to.throwException(/must.+specify.+index/i);
    });
  });

  describe('Queue construction', function() {
    it('should ping the ES server', function() {
      const pingSpy = sinon.spy(client, 'callWithInternalUser').withArgs('ping');
      new Esqueue('esqueue', { client });
      sinon.assert.calledOnce(pingSpy);
    });
  });

  describe('Adding jobs', function() {
    let indexName;
    let jobType;
    let payload;
    let queue;

    beforeEach(function() {
      indexName = 'esqueue-index';
      jobType = 'test-test';
      payload = { payload: true };
      queue = new Esqueue(indexName, { client });
    });

    it('should throw with invalid dateSeparator setting', function() {
      queue = new Esqueue(indexName, { client, dateSeparator: 'a' });
      const fn = () => queue.addJob(jobType, payload);
      expect(fn).to.throwException();
    });

    it('should pass queue instance, index name, type and payload', function() {
      const job = queue.addJob(jobType, payload);
      expect(job.getProp('queue')).to.equal(queue);
      expect(job.getProp('index')).to.match(new RegExp(indexName));
      expect(job.getProp('jobType')).to.equal(jobType);
      expect(job.getProp('payload')).to.equal(payload);
    });

    it('should pass default settings', function() {
      const job = queue.addJob(jobType, payload);
      const options = job.getProp('options');
      expect(options).to.have.property('timeout', constants.DEFAULT_SETTING_TIMEOUT);
    });

    it('should pass queue index settings', function() {
      const indexSettings = {
        index: {
          number_of_shards: 1,
        },
      };

      queue = new Esqueue(indexName, { client, indexSettings });
      const job = queue.addJob(jobType, payload);
      expect(job.getProp('options')).to.have.property('indexSettings', indexSettings);
    });

    it('should pass headers from options', function() {
      const options = {
        headers: {
          authorization: 'Basic cXdlcnR5',
        },
      };
      const job = queue.addJob(jobType, payload, options);
      expect(job.getProp('options')).to.have.property('headers', options.headers);
    });
  });

  describe('Registering workers', function() {
    let queue;

    beforeEach(function() {
      queue = new Esqueue('esqueue', { client });
    });

    it('should keep track of workers', function() {
      expect(queue.getWorkers()).to.eql([]);
      expect(queue.getWorkers()).to.have.length(0);

      queue.registerWorker('test', noop);
      queue.registerWorker('test', noop);
      queue.registerWorker('test2', noop);
      expect(queue.getWorkers()).to.have.length(3);
    });

    it('should pass instance of queue, type, and worker function', function() {
      const workerType = 'test-worker';
      const workerFn = () => true;

      const worker = queue.registerWorker(workerType, workerFn);
      expect(worker.getProp('queue')).to.equal(queue);
      expect(worker.getProp('type')).to.equal(workerType);
      expect(worker.getProp('workerFn')).to.equal(workerFn);
    });

    it('should pass worker options', function() {
      const workerOptions = {
        size: 12,
      };

      queue = new Esqueue('esqueue', { client });
      const worker = queue.registerWorker('type', noop, workerOptions);
      const options = worker.getProp('options');
      expect(options.size).to.equal(workerOptions.size);
    });
  });

  describe('Destroy', function() {
    it('should destroy workers', function() {
      const queue = new Esqueue('esqueue', { client });
      const stubs = times(3, () => {
        return { destroy: sinon.stub() };
      });
      stubs.forEach(stub => queue._workers.push(stub));
      expect(queue.getWorkers()).to.have.length(3);

      queue.destroy();
      stubs.forEach(stub => sinon.assert.calledOnce(stub.destroy));
      expect(queue.getWorkers()).to.have.length(0);
    });
  });
});
