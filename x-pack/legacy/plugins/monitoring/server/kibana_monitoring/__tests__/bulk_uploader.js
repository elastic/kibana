/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash';
import sinon from 'sinon';
import expect from '@kbn/expect';
import { BulkUploader } from '../bulk_uploader';

const FETCH_INTERVAL = 300;
const CHECK_DELAY = 500;

class MockCollectorSet {
  constructor(_mockServer, mockCollectors) {
    this.mockServer = _mockServer;
    this.mockCollectors = mockCollectors;
  }
  isUsageCollector(x) {
    return !!x.isUsageCollector;
  }
  areAllCollectorsReady() {
    return this.mockCollectors.every(collector => collector.isReady());
  }
  getCollectorByType(type) {
    return this.mockCollectors.find(collector => collector.type === type) || this.mockCollectors[0];
  }
  getFilteredCollectorSet(filter) {
    return new MockCollectorSet(this.mockServer, this.mockCollectors.filter(filter));
  }
  async bulkFetch() {
    return this.mockCollectors.map(({ fetch }) => fetch());
  }
  some(someFn) {
    return this.mockCollectors.some(someFn);
  }
}

describe('BulkUploader', () => {
  describe('registers a collector set and runs lifecycle events', () => {
    let server;
    beforeEach(() => {
      const cluster = {
        callWithInternalUser: sinon
          .stub()
          .withArgs('monitoring.bulk')
          .callsFake(() => {
            return new Promise(resolve => setTimeout(resolve, CHECK_DELAY + 1));
          }),
      };

      server = {
        log: sinon.spy(),
        elasticsearchPlugin: {
          createCluster: () => cluster,
          getCluster: () => cluster,
        },
        usage: {},
      };
    });

    it('should skip bulk upload if payload is empty', done => {
      const collectors = new MockCollectorSet(server, [
        {
          type: 'type_collector_test',
          fetch: noop, // empty payloads,
          isReady: () => true,
          formatForBulkUpload: result => result,
        },
      ]);

      const uploader = new BulkUploader({
        ...server,
        interval: FETCH_INTERVAL,
      });

      uploader.start(collectors);

      // allow interval to tick a few times
      setTimeout(() => {
        uploader.stop();

        const loggingCalls = server.log.getCalls();
        expect(loggingCalls.length).to.be.greaterThan(2); // should be 3-5: start, fetch, skip, fetch, skip
        expect(loggingCalls[0].args).to.eql([
          ['info', 'monitoring', 'kibana-monitoring'],
          'Starting monitoring stats collection',
        ]);
        expect(loggingCalls[1].args).to.eql([
          ['debug', 'monitoring', 'kibana-monitoring'],
          'Skipping bulk uploading of an empty stats payload',
        ]);
        expect(loggingCalls[loggingCalls.length - 1].args).to.eql([
          ['info', 'monitoring', 'kibana-monitoring'],
          'Monitoring stats collection is stopped',
        ]);

        done();
      }, CHECK_DELAY);
    });

    it('should not upload if some collectors are not ready', done => {
      const collectors = new MockCollectorSet(server, [
        {
          type: 'type_collector_test',
          fetch: noop, // empty payloads,
          isReady: () => false,
          formatForBulkUpload: result => result,
        },
        {
          type: 'type_collector_test2',
          fetch: noop, // empty payloads,
          isReady: () => true,
          formatForBulkUpload: result => result,
        },
      ]);

      const uploader = new BulkUploader({ ...server, interval: FETCH_INTERVAL });

      uploader.start(collectors);

      // allow interval to tick a few times
      setTimeout(() => {
        uploader.stop();

        const loggingCalls = server.log.getCalls();
        expect(loggingCalls.length).to.be.greaterThan(2); // should be 3-5: start, fetch, skip, fetch, skip
        expect(loggingCalls[0].args).to.eql([
          ['info', 'monitoring', 'kibana-monitoring'],
          'Starting monitoring stats collection',
        ]);
        expect(loggingCalls[1].args).to.eql([
          ['debug', 'monitoring', 'kibana-monitoring'],
          'Skipping bulk uploading because not all collectors are ready',
        ]);
        expect(loggingCalls[loggingCalls.length - 1].args).to.eql([
          ['info', 'monitoring', 'kibana-monitoring'],
          'Monitoring stats collection is stopped',
        ]);

        done();
      }, CHECK_DELAY);
    });

    it('should run the bulk upload handler', done => {
      const collectors = new MockCollectorSet(server, [
        {
          fetch: () => ({ type: 'type_collector_test', result: { testData: 12345 } }),
          isReady: () => true,
          formatForBulkUpload: result => result,
        },
      ]);
      const uploader = new BulkUploader({ ...server, interval: FETCH_INTERVAL });

      uploader.start(collectors);

      // allow interval to tick a few times
      setTimeout(() => {
        uploader.stop();

        const loggingCalls = server.log.getCalls();
        // If we are properly awaiting the bulk upload call, we shouldn't see
        // the last 2 logs as the call takes longer than this timeout (see the above mock)
        expect(loggingCalls.length).to.be(4);
        expect(loggingCalls[0].args).to.eql([
          ['info', 'monitoring', 'kibana-monitoring'],
          'Starting monitoring stats collection',
        ]);
        expect(loggingCalls[1].args).to.eql([
          ['debug', 'monitoring', 'kibana-monitoring'],
          'Uploading bulk stats payload to the local cluster',
        ]);

        done();
      }, CHECK_DELAY);
    });

    it('does not call UsageCollectors if last reported is within the usageInterval', done => {
      const usageCollectorFetch = sinon.stub();
      const collectorFetch = sinon
        .stub()
        .returns({ type: 'type_usage_collector_test', result: { testData: 12345 } });

      const collectors = new MockCollectorSet(server, [
        {
          fetch: usageCollectorFetch,
          isReady: () => true,
          formatForBulkUpload: result => result,
          isUsageCollector: true,
        },
        {
          fetch: collectorFetch,
          isReady: () => true,
          formatForBulkUpload: result => result,
          isUsageCollector: false,
        },
      ]);

      const uploader = new BulkUploader({ ...server, interval: FETCH_INTERVAL });
      uploader._lastFetchUsageTime = Date.now();

      uploader.start(collectors);
      setTimeout(() => {
        uploader.stop();
        expect(collectorFetch.callCount).to.be.greaterThan(0);
        expect(usageCollectorFetch.callCount).to.eql(0);
        done();
      }, CHECK_DELAY);
    });

    it('stops refetching UsageCollectors if uploading to local cluster was not successful', async () => {
      const usageCollectorFetch = sinon
        .stub()
        .returns({ type: 'type_usage_collector_test', result: { testData: 12345 } });

      const collectors = new MockCollectorSet(server, [
        {
          fetch: usageCollectorFetch,
          isReady: () => true,
          formatForBulkUpload: result => result,
          isUsageCollector: true,
        },
      ]);

      const uploader = new BulkUploader({ ...server, interval: FETCH_INTERVAL });

      uploader._onPayload = async () => ({ took: 0, ignored: true, errors: false });

      await uploader._fetchAndUpload(uploader.filterCollectorSet(collectors));
      await uploader._fetchAndUpload(uploader.filterCollectorSet(collectors));
      await uploader._fetchAndUpload(uploader.filterCollectorSet(collectors));

      expect(uploader._holdSendingUsage).to.eql(true);
      expect(usageCollectorFetch.callCount).to.eql(1);
    });

    it('fetches UsageCollectors once uploading to local cluster is successful again', async () => {
      const usageCollectorFetch = sinon
        .stub()
        .returns({ type: 'type_usage_collector_test', result: { usageData: 12345 } });

      const statsCollectorFetch = sinon
        .stub()
        .returns({ type: 'type_stats_collector_test', result: { statsData: 12345 } });

      const collectors = new MockCollectorSet(server, [
        {
          fetch: statsCollectorFetch,
          isReady: () => true,
          formatForBulkUpload: result => result,
          isUsageCollector: false,
        },
        {
          fetch: usageCollectorFetch,
          isReady: () => true,
          formatForBulkUpload: result => result,
          isUsageCollector: true,
        },
      ]);

      const uploader = new BulkUploader({ ...server, interval: FETCH_INTERVAL });
      let bulkIgnored = true;
      uploader._onPayload = async () => ({ took: 0, ignored: bulkIgnored, errors: false });

      await uploader._fetchAndUpload(uploader.filterCollectorSet(collectors));
      expect(uploader._holdSendingUsage).to.eql(true);

      bulkIgnored = false;
      await uploader._fetchAndUpload(uploader.filterCollectorSet(collectors));
      await uploader._fetchAndUpload(uploader.filterCollectorSet(collectors));

      expect(uploader._holdSendingUsage).to.eql(false);
      expect(usageCollectorFetch.callCount).to.eql(2);
      expect(statsCollectorFetch.callCount).to.eql(3);
    });

    it('calls UsageCollectors if last reported exceeds during a _usageInterval', done => {
      const usageCollectorFetch = sinon.stub();
      const collectorFetch = sinon
        .stub()
        .returns({ type: 'type_usage_collector_test', result: { testData: 12345 } });

      const collectors = new MockCollectorSet(server, [
        {
          fetch: usageCollectorFetch,
          isReady: () => true,
          formatForBulkUpload: result => result,
          isUsageCollector: true,
        },
        {
          fetch: collectorFetch,
          isReady: () => true,
          formatForBulkUpload: result => result,
          isUsageCollector: false,
        },
      ]);

      const uploader = new BulkUploader({ ...server, interval: FETCH_INTERVAL });
      uploader._lastFetchUsageTime = Date.now() - uploader._usageInterval;

      uploader.start(collectors);
      setTimeout(() => {
        uploader.stop();
        expect(collectorFetch.callCount).to.be.greaterThan(0);
        expect(usageCollectorFetch.callCount).to.be.greaterThan(0);
        done();
      }, CHECK_DELAY);
    });
  });
});
