/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';

import { getTelemetry } from '../telemetry';

describe('telemetry', () => {

  describe('getTelemetry', () => {

    const req = { };
    const config = { };
    const start = 'start';
    const end = 'end';
    let _getAllStats;
    let _getLocalStats;

    beforeEach(() => {
      config.get = sinon.stub();
      _getAllStats = sinon.stub();
      _getLocalStats = sinon.stub();
    });

    it('returns monitoring telemetry when possible', async () => {
      const response = [ { totally: 'real' } ];

      config.get.withArgs('xpack.monitoring.enabled').returns(true);
      _getAllStats.withArgs(req, start, end).returns(response);

      expect(await getTelemetry(req, config, start, end, { _getAllStats, _getLocalStats })).to.be(response);

      expect(config.get.calledOnce).to.be(true);
      expect(_getAllStats.calledOnce).to.be(true);
      expect(_getLocalStats.calledOnce).to.be(false);
    });

    it('uses local and ignores monitoring telemetry when empty', async () => {
      const response = { collection: 'local' };

      config.get.withArgs('xpack.monitoring.enabled').returns(true);
      _getAllStats.withArgs(req, start, end).returns([]);
      _getLocalStats.withArgs(req).returns(response);

      expect(await getTelemetry(req, config, start, end, { _getAllStats, _getLocalStats })).to.eql([ response ]);

      expect(config.get.calledOnce).to.be(true);
      expect(_getAllStats.calledOnce).to.be(true);
      expect(_getLocalStats.calledOnce).to.be(true);
    });

    it('uses local and ignores monitoring telemetry when invalid', async () => {
      const response = { collection: 'local' };

      config.get.withArgs('xpack.monitoring.enabled').returns(true);
      _getAllStats.withArgs(req, start, end).returns({ not: 'an array' });
      _getLocalStats.withArgs(req).returns(response);

      expect(await getTelemetry(req, config, start, end, { _getAllStats, _getLocalStats })).to.eql([ response ]);

      expect(config.get.calledOnce).to.be(true);
      expect(_getAllStats.calledOnce).to.be(true);
      expect(_getLocalStats.calledOnce).to.be(true);
    });

    it('uses local when monitoring is disabled', async () => {
      const response = { collection: 'local' };

      config.get.withArgs('xpack.monitoring.enabled').returns(false);
      _getLocalStats.withArgs(req).returns(response);

      expect(await getTelemetry(req, config, start, end, { _getAllStats, _getLocalStats })).to.eql([ response ]);

      expect(config.get.calledOnce).to.be(true);
      expect(_getAllStats.calledOnce).to.be(false);
      expect(_getLocalStats.calledOnce).to.be(true);
    });

  });

});
