/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import moment from 'moment';
import { noop, random, get, find, identity } from 'lodash';
import { ClientMock } from './fixtures/elasticsearch';
import { QueueMock } from './fixtures/queue';
import { Worker } from '../worker';
import { constants } from '../constants';

const anchor = '2016-04-02T01:02:03.456'; // saturday
const defaults = {
  timeout: 10000,
  size: 10,
  unknownMime: false,
  contentBody: null,
};

const defaultWorkerOptions = {
  interval: 3000,
  intervalErrorMultiplier: 10
};

describe('Worker class', function () {
  // some of these tests might be a little slow, give them a little extra time
  this.timeout(10000);

  let anchorMoment;
  let clock;
  let client;
  let mockQueue;
  let worker;
  let worker2;


  // Allowing the Poller to poll requires intimate knowledge of the inner workings of the Poller.
  // We have to ensure that the Promises internal to the `_poll` method are resolved to queue up
  // the next setTimeout before incrementing the clock.
  const allowPoll = async (interval) => {
    clock.tick(interval);
    await Promise.resolve();
    await Promise.resolve();
  };

  beforeEach(function () {
    client = new ClientMock();
    mockQueue = new QueueMock();
    mockQueue.setClient(client);
  });

  afterEach(function () {
    [worker, worker2].forEach(actualWorker => {
      if (actualWorker) {
        actualWorker.destroy();
      }
    });
  });

  describe('invalid construction', function () {
    it('should throw without a type', function () {
      const init = () => new Worker(mockQueue);
      expect(init).to.throwException(/type.+string/i);
    });

    it('should throw without an invalid type', function () {
      const init = () => new Worker(mockQueue, { string: false });
      expect(init).to.throwException(/type.+string/i);
    });

    it('should throw without a workerFn', function () {
      const init = () => new Worker(mockQueue, 'test');
      expect(init).to.throwException(/workerFn.+function/i);
    });

    it('should throw with an invalid workerFn', function () {
      const init = () => new Worker(mockQueue, 'test', { function: false });
      expect(init).to.throwException(/workerFn.+function/i);
    });

    it('should throw without an opts', function () {
      const init = () => new Worker(mockQueue, 'test', noop);
      expect(init).to.throwException(/opts.+object/i);
    });

    it('should throw with an invalid opts.interval', function () {
      const init = () => new Worker(mockQueue, 'test', noop, { });
      expect(init).to.throwException(/opts\.interval.+number/i);
    });

    it('should throw with an invalid opts.intervalErrorMultiplier', function () {
      const init = () => new Worker(mockQueue, 'test', noop, { interval: 1 });
      expect(init).to.throwException(/opts\.intervalErrorMultiplier.+number/i);
    });
  });

  describe('construction', function () {
    it('should assign internal properties', function () {
      const jobtype = 'testjob';
      const workerFn = noop;
      worker = new Worker(mockQueue, jobtype, workerFn, defaultWorkerOptions);
      expect(worker).to.have.property('id');
      expect(worker).to.have.property('queue', mockQueue);
      expect(worker).to.have.property('jobtype', jobtype);
      expect(worker).to.have.property('workerFn', workerFn);
      expect(worker).to.have.property('checkSize');
    });

    it('should have a unique ID', function () {
      worker = new Worker(mockQueue, 'test', noop, defaultWorkerOptions);
      expect(worker.id).to.be.a('string');

      worker2 = new Worker(mockQueue, 'test', noop, defaultWorkerOptions);
      expect(worker2.id).to.be.a('string');

      expect(worker.id).to.not.equal(worker2.id);
    });
  });

  describe('event emitting', function () {
    beforeEach(function () {
      worker = new Worker(mockQueue, 'test', noop, defaultWorkerOptions);
    });

    it('should trigger events on the queue instance', function (done) {
      const eventName = 'test event';
      const payload1 = {
        test: true,
        deep: { object: 'ok' }
      };
      const payload2 = 'two';
      const payload3 = new Error('test error');

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

      worker.emit(eventName, payload1, payload2, payload3);
    });
  });

  describe('output formatting', function () {
    let f;

    beforeEach(function () {
      worker = new Worker(mockQueue, 'test', noop, defaultWorkerOptions);
      f = (output) => worker._formatOutput(output);
    });

    it('should handle primitives', function () {
      const primitives = ['test', true, 1234, { one: 1 }, [5, 6, 7, 8]];

      primitives.forEach((val) => {
        expect(f(val)).to.have.property('content_type', defaults.unknownMime);
        expect(f(val)).to.have.property('content', val);
      });
    });

    it('should accept content object without type', function () {
      const output = {
        content: 'test output'
      };

      expect(f(output)).to.have.property('content_type', defaults.unknownMime);
      expect(f(output)).to.have.property('content', output.content);
    });

    it('should accept a content type', function () {
      const output = {
        content_type: 'test type',
        content: 'test output'
      };

      expect(f(output)).to.have.property('content_type', output.content_type);
      expect(f(output)).to.have.property('content', output.content);
    });

    it('should work with no input', function () {
      expect(f()).to.have.property('content_type', defaults.unknownMime);
      expect(f()).to.have.property('content', defaults.contentBody);
    });
  });

  describe('polling for jobs', function () {
    beforeEach(() => {
      anchorMoment = moment(anchor);
      clock = sinon.useFakeTimers(anchorMoment.valueOf());
    });

    afterEach(() => {
      clock.restore();
    });

    it('should start polling for jobs after interval', async function () {
      worker = new Worker(mockQueue, 'test', noop, defaultWorkerOptions);
      const processPendingJobsStub = sinon.stub(worker, '_processPendingJobs').callsFake(() => Promise.resolve());
      sinon.assert.notCalled(processPendingJobsStub);
      await allowPoll(defaultWorkerOptions.interval);
      sinon.assert.calledOnce(processPendingJobsStub);
    });

    it('should use interval option to control polling', async function () {
      const interval = 567;
      worker = new Worker(mockQueue, 'test', noop, { ...defaultWorkerOptions, interval });
      const processPendingJobsStub = sinon.stub(worker, '_processPendingJobs').callsFake(() => Promise.resolve());

      sinon.assert.notCalled(processPendingJobsStub);
      await allowPoll(interval);
      sinon.assert.calledOnce(processPendingJobsStub);
    });

    it('should not poll once destroyed', async function () {
      worker = new Worker(mockQueue, 'test', noop, defaultWorkerOptions);

      const processPendingJobsStub = sinon.stub(worker, '_processPendingJobs').callsFake(() => Promise.resolve());

      // move the clock a couple times, test for searches each time
      sinon.assert.notCalled(processPendingJobsStub);
      await allowPoll(defaultWorkerOptions.interval);
      sinon.assert.calledOnce(processPendingJobsStub);
      await allowPoll(defaultWorkerOptions.interval);
      sinon.assert.calledTwice(processPendingJobsStub);

      // destroy the worker, move the clock, make sure another search doesn't happen
      worker.destroy();
      await allowPoll(defaultWorkerOptions.interval);
      sinon.assert.calledTwice(processPendingJobsStub);

      // manually call job poller, move the clock, make sure another search doesn't happen
      worker._startJobPolling();
      await allowPoll(defaultWorkerOptions.interval);
      sinon.assert.calledTwice(processPendingJobsStub);
    });

    it('should use error multiplier when processPendingJobs rejects the Promise', async function () {
      worker = new Worker(mockQueue, 'test', noop, defaultWorkerOptions);

      const processPendingJobsStub = sinon.stub(worker, '_processPendingJobs').returns(Promise.reject(new Error('test error')));

      await allowPoll(defaultWorkerOptions.interval);
      expect(processPendingJobsStub.callCount).to.be(1);
      await allowPoll(defaultWorkerOptions.interval);
      expect(processPendingJobsStub.callCount).to.be(1);
      await allowPoll(defaultWorkerOptions.interval * defaultWorkerOptions.intervalErrorMultiplier);
      expect(processPendingJobsStub.callCount).to.be(2);
    });

    it('should not use error multiplier when processPendingJobs resolved the Promise', async function () {
      worker = new Worker(mockQueue, 'test', noop, defaultWorkerOptions);

      const processPendingJobsStub = sinon.stub(worker, '_processPendingJobs').callsFake(() => Promise.resolve());

      await allowPoll(defaultWorkerOptions.interval);
      expect(processPendingJobsStub.callCount).to.be(1);
      await allowPoll(defaultWorkerOptions.interval);
      expect(processPendingJobsStub.callCount).to.be(2);
    });
  });

  describe('query for pending jobs', function () {
    let searchStub;

    function getSearchParams(jobtype = 'test', params = {}) {
      worker = new Worker(mockQueue, jobtype, noop, { ...defaultWorkerOptions, ...params });
      worker._getPendingJobs();
      return searchStub.firstCall.args[1];
    }

    describe('error handling', function () {
      it('should pass search errors', function (done) {
        searchStub = sinon.stub(mockQueue.client, 'callWithInternalUser')
          .withArgs('search')
          .callsFake(() => Promise.reject());
        worker = new Worker(mockQueue, 'test', noop, defaultWorkerOptions);
        worker._getPendingJobs()
          .then(() => done(new Error('should not resolve')))
          .catch(() => {
            done();
          });
      });

      describe('missing index', function () {

        it('should swallow error', function (done) {
          searchStub = sinon.stub(mockQueue.client, 'callWithInternalUser')
            .withArgs('search')
            .callsFake(() => Promise.reject({ status: 404 }));
          worker = new Worker(mockQueue, 'test', noop, defaultWorkerOptions);
          worker._getPendingJobs()
            .then(() => { done(); })
            .catch(() => done(new Error('should not reject')));
        });

        it('should return an empty array', function (done) {
          searchStub = sinon.stub(mockQueue.client, 'callWithInternalUser')
            .withArgs('search')
            .callsFake(() => Promise.reject({ status: 404 }));
          worker = new Worker(mockQueue, 'test', noop, defaultWorkerOptions);
          worker._getPendingJobs()
            .then((res) => {
              try {
                expect(res).to.be.an(Array);
                expect(res).to.have.length(0);
                done();
              } catch (e) {
                done(e);
              }
            })
            .catch(() => done(new Error('should not reject')));
        });
      });
    });

    describe('query body', function () {
      const conditionPath = 'query.bool.filter.bool';
      const jobtype = 'test_jobtype';

      beforeEach(() => {
        searchStub = sinon.stub(mockQueue.client, 'callWithInternalUser')
          .withArgs('search')
          .callsFake(() => Promise.resolve({ hits: { hits: [] } }));
        anchorMoment = moment(anchor);
        clock = sinon.useFakeTimers(anchorMoment.valueOf());
      });

      afterEach(() => {
        clock.restore();
      });

      it('should query with seq_no_primary_term', function () {
        const { body } = getSearchParams(jobtype);
        expect(body).to.have.property('seq_no_primary_term', true);
      });

      it('should filter unwanted source data', function () {
        const excludedFields = [ 'output.content' ];
        const { body } = getSearchParams(jobtype);
        expect(body).to.have.property('_source');
        expect(body._source).to.eql({ excludes: excludedFields });
      });

      it('should search for pending or expired jobs', function () {
        const { body } = getSearchParams(jobtype);
        const conditions = get(body, conditionPath);
        expect(conditions).to.have.property('should');

        // this works because we are stopping the clock, so all times match
        const nowTime = moment().toISOString();
        const pending = { term: { status: 'pending' } };
        const expired = { bool: { must: [
          { term: { status: 'processing' } },
          { range: { process_expiration: { lte: nowTime } } }
        ] } };

        const pendingMatch = find(conditions.should, pending);
        expect(pendingMatch).to.not.be(undefined);

        const expiredMatch = find(conditions.should, expired);
        expect(expiredMatch).to.not.be(undefined);
      });

      it('specify that there should be at least one match', function () {
        const { body } = getSearchParams(jobtype);
        const conditions = get(body, conditionPath);
        expect(conditions).to.have.property('minimum_should_match', 1);
      });

      it('should use default size', function () {
        const { body } = getSearchParams(jobtype);
        expect(body).to.have.property('size', defaults.size);
      });

      it('should observe the size option', function () {
        const size = 25;
        const { body } = getSearchParams(jobtype, { size });
        expect(body).to.have.property('size', size);
      });
    });
  });

  describe('claiming a job', function () {
    let params;
    let job;
    let updateSpy;

    beforeEach(function () {
      anchorMoment = moment(anchor);
      clock = sinon.useFakeTimers(anchorMoment.valueOf());

      params = {
        index: 'myIndex',
        type: 'test',
        id: 12345,
      };
      return mockQueue.client.callWithInternalUser('get', params)
        .then((jobDoc) => {
          job = jobDoc;
          worker = new Worker(mockQueue, 'test', noop, defaultWorkerOptions);
          updateSpy = sinon.spy(mockQueue.client, 'callWithInternalUser').withArgs('update');
        });
    });

    afterEach(() => {
      clock.restore();
    });

    it('should use seqNo and primaryTerm on update', function () {
      worker._claimJob(job);
      const query = updateSpy.firstCall.args[1];
      expect(query).to.have.property('index', job._index);
      expect(query).to.have.property('id', job._id);
      expect(query).to.have.property('if_seq_no', job._seq_no);
      expect(query).to.have.property('if_primary_term', job._primary_term);
    });

    it('should increment the job attempts', function () {
      worker._claimJob(job);
      const doc = updateSpy.firstCall.args[1].body.doc;
      expect(doc).to.have.property('attempts', job._source.attempts + 1);
    });

    it('should update the job status', function () {
      worker._claimJob(job);
      const doc = updateSpy.firstCall.args[1].body.doc;
      expect(doc).to.have.property('status', constants.JOB_STATUS_PROCESSING);
    });

    it('should set job expiration time', function () {
      worker._claimJob(job);
      const doc = updateSpy.firstCall.args[1].body.doc;
      const expiration = anchorMoment.add(defaults.timeout).toISOString();
      expect(doc).to.have.property('process_expiration', expiration);
    });

    it('should fail job if max_attempts are hit', function () {
      const failSpy = sinon.spy(worker, '_failJob');
      job._source.attempts = job._source.max_attempts;
      worker._claimJob(job);
      sinon.assert.calledOnce(failSpy);
    });

    it('should append error message if no existing content', function () {
      const failSpy = sinon.spy(worker, '_failJob');
      job._source.attempts = job._source.max_attempts;
      expect(job._source.output).to.be(undefined);
      worker._claimJob(job);
      const msg = failSpy.firstCall.args[1];
      expect(msg).to.contain('Max attempts reached');
      expect(msg).to.contain(job._source.max_attempts);
    });

    it('should not append message if existing output', function () {
      const failSpy = sinon.spy(worker, '_failJob');
      job._source.attempts = job._source.max_attempts;
      job._source.output = 'i have some output';
      worker._claimJob(job);
      const msg = failSpy.firstCall.args[1];
      expect(msg).to.equal(false);
    });

    it('should reject the promise on conflict errors', function () {
      mockQueue.client.callWithInternalUser.restore();
      sinon.stub(mockQueue.client, 'callWithInternalUser')
        .withArgs('update')
        .returns(Promise.reject({ statusCode: 409 }));
      return worker._claimJob(job)
        .catch(err => {
          expect(err).to.eql({ statusCode: 409 });
        });
    });

    it('should reject the promise on other errors', function () {
      mockQueue.client.callWithInternalUser.restore();
      sinon.stub(mockQueue.client, 'callWithInternalUser')
        .withArgs('update')
        .returns(Promise.reject({ statusCode: 401 }));
      return worker._claimJob(job)
        .catch(err => {
          expect(err).to.eql({ statusCode: 401 });
        });
    });
  });

  describe('find a pending job to claim', function () {
    const getMockJobs = (status = 'pending') => ([{
      _index: 'myIndex',
      _id: 12345,
      _seq_no: 3,
      _primary_term: 3,
      found: true,
      _source: {
        jobtype: 'jobtype',
        created_by: false,
        payload: { id: 'sample-job-1', now: 'Mon Apr 25 2016 14:13:04 GMT-0700 (MST)' },
        priority: 10,
        timeout: 10000,
        created_at: '2016-04-25T21:13:04.738Z',
        attempts: 0,
        max_attempts: 3,
        status
      },
    }]);

    beforeEach(function () {
      worker = new Worker(mockQueue, 'test', noop, defaultWorkerOptions);
    });

    afterEach(() => {
      mockQueue.client.callWithInternalUser.restore();
    });

    it('should emit for errors from claiming job', function (done) {
      sinon.stub(mockQueue.client, 'callWithInternalUser')
        .withArgs('update')
        .returns(Promise.reject({ statusCode: 401 }));

      worker.once(constants.EVENT_WORKER_JOB_CLAIM_ERROR, function (err) {
        try {
          expect(err).to.have.property('error');
          expect(err).to.have.property('job');
          expect(err).to.have.property('worker');
          expect(err.error).to.have.property('statusCode', 401);
          done();
        } catch (e) {
          done(e);
        }
      });

      worker._claimPendingJobs(getMockJobs());
    });

    it('should reject the promise if an error claiming the job', function () {
      sinon.stub(mockQueue.client, 'callWithInternalUser')
        .withArgs('update')
        .returns(Promise.reject({ statusCode: 409 }));
      return worker._claimPendingJobs(getMockJobs())
        .catch(err => {
          expect(err).to.eql({ statusCode: 409 });
        });
    });

    it('should get the pending job', function () {
      sinon.stub(mockQueue.client, 'callWithInternalUser')
        .withArgs('update')
        .returns(Promise.resolve({ test: 'cool' }));
      sinon.stub(worker, '_performJob').callsFake(identity);
      return worker._claimPendingJobs(getMockJobs())
        .then(claimedJob => {
          expect(claimedJob._index).to.be('myIndex');
          expect(claimedJob._source.jobtype).to.be('jobtype');
          expect(claimedJob._source.status).to.be('processing');
          expect(claimedJob.test).to.be('cool');
          worker._performJob.restore();
        });
    });
  });

  describe('failing a job', function () {
    let job;
    let updateSpy;

    beforeEach(function () {
      anchorMoment = moment(anchor);
      clock = sinon.useFakeTimers(anchorMoment.valueOf());

      return mockQueue.client.callWithInternalUser('get')
        .then((jobDoc) => {
          job = jobDoc;
          worker = new Worker(mockQueue, 'test', noop, defaultWorkerOptions);
          updateSpy = sinon.spy(mockQueue.client, 'callWithInternalUser').withArgs('update');
        });
    });

    afterEach(() => {
      clock.restore();
    });

    it('should use _seq_no and _primary_term on update', function () {
      worker._failJob(job);
      const query = updateSpy.firstCall.args[1];
      expect(query).to.have.property('index', job._index);
      expect(query).to.have.property('id', job._id);
      expect(query).to.have.property('if_seq_no', job._seq_no);
      expect(query).to.have.property('if_primary_term', job._primary_term);
    });

    it('should set status to failed', function () {
      worker._failJob(job);
      const doc = updateSpy.firstCall.args[1].body.doc;
      expect(doc).to.have.property('status', constants.JOB_STATUS_FAILED);
    });

    it('should append error message if supplied', function () {
      const msg = 'test message';
      worker._failJob(job, msg);
      const doc = updateSpy.firstCall.args[1].body.doc;
      expect(doc).to.have.property('output');
      expect(doc.output).to.have.property('content', msg);
    });

    it('should return true on conflict errors', function () {
      mockQueue.client.callWithInternalUser.restore();
      sinon.stub(mockQueue.client, 'callWithInternalUser')
        .withArgs('update')
        .returns(Promise.reject({ statusCode: 409 }));
      return worker._failJob(job)
        .then((res) => expect(res).to.equal(true));
    });

    it('should return false on other document update errors', function () {
      mockQueue.client.callWithInternalUser.restore();
      sinon.stub(mockQueue.client, 'callWithInternalUser')
        .withArgs('update')
        .returns(Promise.reject({ statusCode: 401 }));
      return worker._failJob(job)
        .then((res) => expect(res).to.equal(false));
    });

    it('should set completed time and status to failure', function () {
      const startTime = moment().valueOf();
      const msg = 'test message';
      clock.tick(100);

      worker._failJob(job, msg);
      const doc = updateSpy.firstCall.args[1].body.doc;
      expect(doc).to.have.property('output');
      expect(doc).to.have.property('status', constants.JOB_STATUS_FAILED);
      expect(doc).to.have.property('completed_at');
      const completedTimestamp = moment(doc.completed_at).valueOf();
      expect(completedTimestamp).to.be.greaterThan(startTime);
    });

    it('should emit worker failure event', function (done) {
      worker.on(constants.EVENT_WORKER_JOB_FAIL, (err) => {
        try {
          expect(err).to.have.property('output');
          expect(err).to.have.property('job');
          expect(err).to.have.property('worker');
          done();
        } catch (e) {
          done(e);
        }
      });

      return worker._failJob(job);
    });

    it('should emit on other document update errors', function (done) {
      mockQueue.client.callWithInternalUser.restore();
      sinon.stub(mockQueue.client, 'callWithInternalUser')
        .withArgs('update')
        .returns(Promise.reject({ statusCode: 401 }));

      worker.on(constants.EVENT_WORKER_FAIL_UPDATE_ERROR, function (err) {
        try {
          expect(err).to.have.property('error');
          expect(err).to.have.property('job');
          expect(err).to.have.property('worker');
          expect(err.error).to.have.property('statusCode', 401);
          done();
        } catch (e) {
          done(e);
        }
      });
      worker._failJob(job);
    });
  });

  describe('performing a job', function () {
    let job;
    let payload;
    let updateSpy;

    beforeEach(function () {
      payload = {
        value: random(0, 100, true)
      };

      return mockQueue.client.callWithInternalUser('get', {}, { payload })
        .then((jobDoc) => {
          job = jobDoc;
          updateSpy = sinon.spy(mockQueue.client, 'callWithInternalUser').withArgs('update');
        });
    });

    describe('worker success', function () {
      it('should call the workerFn with the payload', function (done) {
        const workerFn = function (jobPayload) {
          expect(jobPayload).to.eql(payload);
        };
        worker = new Worker(mockQueue, 'test', workerFn, defaultWorkerOptions);

        worker._performJob(job)
          .then(() => done());
      });

      it('should update the job with the workerFn output', function () {
        const workerFn = function (job, jobPayload) {
          expect(jobPayload).to.eql(payload);
          return payload;
        };
        worker = new Worker(mockQueue, 'test', workerFn, defaultWorkerOptions);

        return worker._performJob(job)
          .then(() => {
            sinon.assert.calledOnce(updateSpy);
            const query = updateSpy.firstCall.args[1];

            expect(query).to.have.property('index', job._index);
            expect(query).to.have.property('id', job._id);
            expect(query).to.have.property('if_seq_no', job._seq_no);
            expect(query).to.have.property('if_primary_term', job._primary_term);
            expect(query.body.doc).to.have.property('output');
            expect(query.body.doc.output).to.have.property('content_type', false);
            expect(query.body.doc.output).to.have.property('content', payload);
          });
      });

      it('should update the job status and completed time', function () {
        const startTime = moment().valueOf();
        const workerFn = function (job, jobPayload) {
          expect(jobPayload).to.eql(payload);
          return new Promise(function (resolve) {
            setTimeout(() => resolve(payload), 10);
          });
        };
        worker = new Worker(mockQueue, 'test', workerFn, defaultWorkerOptions);

        return worker._performJob(job)
          .then(() => {
            sinon.assert.calledOnce(updateSpy);
            const doc = updateSpy.firstCall.args[1].body.doc;
            expect(doc).to.have.property('status', constants.JOB_STATUS_COMPLETED);
            expect(doc).to.have.property('completed_at');
            const completedTimestamp = moment(doc.completed_at).valueOf();
            expect(completedTimestamp).to.be.greaterThan(startTime);
          });
      });

      it('should emit completion event', function (done) {
        worker = new Worker(mockQueue, 'test', noop, defaultWorkerOptions);

        worker.once(constants.EVENT_WORKER_COMPLETE, (workerJob) => {
          try {
            expect(workerJob).to.not.have.property('_source');

            expect(workerJob).to.have.property('job');
            expect(workerJob.job).to.have.property('id');
            expect(workerJob.job).to.have.property('index');

            expect(workerJob).to.have.property('output');
            expect(workerJob.output).to.have.property('content');
            expect(workerJob.output).to.have.property('content_type');

            done();
          } catch (e) {
            done(e);
          }
        });

        worker._performJob(job);
      });
    });

    describe('worker failure', function () {
      it('should append error output to job', function () {
        const workerFn = function () {
          throw new Error('test error');
        };
        worker = new Worker(mockQueue, 'test', workerFn, defaultWorkerOptions);
        const failStub = sinon.stub(worker, '_failJob');

        return worker._performJob(job)
          .then(() => {
            sinon.assert.calledOnce(failStub);
            sinon.assert.calledWith(failStub, job, 'Error: test error');
          });
      });

      it('should handle async errors', function () {
        const workerFn = function () {
          return new Promise((resolve, reject) => {
            reject(new Error('test error'));
          });
        };
        worker = new Worker(mockQueue, 'test', workerFn, defaultWorkerOptions);
        const failStub = sinon.stub(worker, '_failJob');

        return worker._performJob(job)
          .then(() => {
            sinon.assert.calledOnce(failStub);
            sinon.assert.calledWith(failStub, job, 'Error: test error');
          });
      });

      it('should handle rejecting with strings', function () {
        const errorMessage = 'this is a string error';
        const workerFn = function () {
          return new Promise((resolve, reject) => {
            reject(errorMessage);
          });
        };
        worker = new Worker(mockQueue, 'test', workerFn, defaultWorkerOptions);
        const failStub = sinon.stub(worker, '_failJob');

        return worker._performJob(job)
          .then(() => {
            sinon.assert.calledOnce(failStub);
            sinon.assert.calledWith(failStub, job, errorMessage);
          });
      });

      it('should handle empty rejection', function (done) {
        const workerFn = function () {
          return new Promise((resolve, reject) => {
            reject();
          });
        };
        worker = new Worker(mockQueue, 'test', workerFn, defaultWorkerOptions);

        worker.once(constants.EVENT_WORKER_JOB_EXECUTION_ERROR, (err) => {
          try {
            expect(err).to.have.property('error');
            expect(err).to.have.property('job');
            expect(err).to.have.property('worker');
            expect(err.error).to.have.property('name', 'UnspecifiedWorkerError');
            done();
          } catch (e) {
            done(e);
          }
        });

        worker._performJob(job);
      });
    });
  });

  describe('job failures', function () {
    function getFailStub(workerWithFailure) {
      return sinon.stub(workerWithFailure, '_failJob').returns(Promise.resolve());
    }

    describe('saving output failure', () => {
      it('should mark the job as failed if saving to ES fails', async () => {
        const job = {
          _id: 'shouldSucced',
          _source: {
            timeout: 1000,
            payload: 'test'
          }
        };

        sinon.stub(mockQueue.client, 'callWithInternalUser')
          .withArgs('update')
          .returns(Promise.reject({ statusCode: 413 }));

        const workerFn = function (jobPayload) {
          return new Promise(function (resolve) {
            setTimeout(() => resolve(jobPayload), 10);
          });
        };
        const worker = new Worker(mockQueue, 'test', workerFn, defaultWorkerOptions);
        const failStub = getFailStub(worker);

        await worker._performJob(job);
        worker.destroy();

        sinon.assert.called(failStub);
      });
    });

    describe('search failure', function () {
      it('causes _processPendingJobs to reject the Promise', function () {
        sinon.stub(mockQueue.client, 'callWithInternalUser')
          .withArgs('search')
          .returns(Promise.reject(new Error('test error')));
        worker = new Worker(mockQueue, 'test', noop, defaultWorkerOptions);
        return worker._processPendingJobs()
          .then(() => {
            expect().fail('expected rejected Promise');
          }, (err) => {
            expect(err).to.be.an(Error);
          });
      });
    });

    describe('timeout', function () {
      let failStub;
      let job;
      let cancellationCallback;

      beforeEach(function () {
        const timeout = 20;
        cancellationCallback = function () {};

        const workerFn = function (job, payload, cancellationToken) {
          cancellationToken.on(cancellationCallback);
          return new Promise(function (resolve) {
            setTimeout(() => {
              resolve();
            }, timeout * 2);
          });
        };
        worker = new Worker(mockQueue, 'test', workerFn, defaultWorkerOptions);
        failStub = getFailStub(worker);

        job = {
          _id: 'testTimeoutJob',
          _source: {
            timeout: timeout,
            payload: 'test'
          }
        };
      });

      it('should not fail job', function () {
        // fire of the job worker
        return worker._performJob(job)
          .then(() => {
            sinon.assert.notCalled(failStub);
          });
      });

      it('should emit timeout if not completed in time', function (done) {
        worker.once(constants.EVENT_WORKER_JOB_TIMEOUT, (err) => {
          try {
            expect(err).to.have.property('error');
            expect(err).to.have.property('job');
            expect(err).to.have.property('worker');
            expect(err.error).to.have.property('name', 'WorkerTimeoutError');
            done();
          } catch (e) {
            done(e);
          }
        });

        // fire of the job worker
        worker._performJob(job);
      });

      it('should call cancellation token callback if not completed in time', function (done) {
        let called = false;

        cancellationCallback = () => {
          called = true;
        };

        worker.once(constants.EVENT_WORKER_JOB_TIMEOUT, () => {
          try {
            expect(called).to.be(true);
            done();
          } catch(err) {
            done(err);
          }
        });

        // fire of the job worker
        worker._performJob(job);
      });
    });

    describe('worker failure', function () {
      let failStub;

      const timeout = 20;
      const job = {
        _id: 'testTimeoutJob',
        _source: {
          timeout: timeout,
          payload: 'test'
        }
      };

      beforeEach(function () {
        sinon.stub(mockQueue.client, 'callWithInternalUser')
          .withArgs('search')
          .callsFake(() => Promise.resolve({ hits: { hits: [] } }));
      });

      describe('workerFn rejects promise', function () {
        beforeEach(function () {
          const workerFn = function () {
            return new Promise(function (resolve, reject) {
              setTimeout(() => {
                reject();
              }, timeout / 2);
            });
          };
          worker = new Worker(mockQueue, 'test', workerFn, defaultWorkerOptions);
          failStub = getFailStub(worker);
        });

        it('should fail the job', function () {
          return worker._performJob(job)
            .then(() => {
              sinon.assert.calledOnce(failStub);
            });
        });

        it('should emit worker execution error', function (done) {
          worker.on(constants.EVENT_WORKER_JOB_EXECUTION_ERROR, (err) => {
            try {
              expect(err).to.have.property('error');
              expect(err).to.have.property('job');
              expect(err).to.have.property('worker');
              done();
            } catch (e) {
              done(e);
            }
          });

          // fire of the job worker
          worker._performJob(job);
        });
      });

      describe('workerFn throws error', function () {
        beforeEach(function () {
          const workerFn = function () {
            throw new Error('test throw');
          };
          worker = new Worker(mockQueue, 'test', workerFn, defaultWorkerOptions);

          failStub = getFailStub(worker);
        });

        it('should fail the job', function () {
          return worker._performJob(job)
            .then(() => {
              sinon.assert.calledOnce(failStub);
            });
        });

        it('should emit worker execution error', function (done) {
          worker.on(constants.EVENT_WORKER_JOB_EXECUTION_ERROR, (err) => {
            try {
              expect(err).to.have.property('error');
              expect(err).to.have.property('job');
              expect(err).to.have.property('worker');
              done();
            } catch (e) {
              done(e);
            }
          });

          // fire of the job worker
          worker._performJob(job);
        });
      });
    });
  });
});
