/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { verifyMonitoringLicense } from '../verify_monitoring_license';
import expect from '@kbn/expect';
import sinon from 'sinon';

describe('Monitoring Verify License', () => {
  describe('Disabled by Configuration', () => {
    const get = sinon
      .stub()
      .withArgs('xpack.monitoring.cluster_alerts.enabled')
      .returns(false);
    const server = { config: sinon.stub().returns({ get }) };

    it('verifyMonitoringLicense returns false without checking the license', () => {
      const verification = verifyMonitoringLicense(server);

      expect(verification.enabled).to.be(false);
      expect(verification.message).to.be('Cluster Alerts feature is disabled.');

      expect(get.withArgs('xpack.monitoring.cluster_alerts.enabled').calledOnce).to.be(true);
    });
  });

  describe('Enabled by Configuration', () => {
    it('verifyMonitoringLicense returns false if enabled by configuration, but not by license', () => {
      const get = sinon
        .stub()
        .withArgs('xpack.monitoring.cluster_alerts.enabled')
        .returns(true);
      const server = {
        config: sinon.stub().returns({ get }),
        plugins: { monitoring: { info: {} } },
      };
      const getLicenseCheckResults = sinon
        .stub()
        .returns({ clusterAlerts: { enabled: false }, message: 'failed!!' });
      const feature = sinon
        .stub()
        .withArgs('monitoring')
        .returns({ getLicenseCheckResults });

      server.plugins.monitoring.info = { feature };

      const verification = verifyMonitoringLicense(server);

      expect(verification.enabled).to.be(false);
      expect(verification.message).to.be('failed!!');

      expect(get.withArgs('xpack.monitoring.cluster_alerts.enabled').calledOnce).to.be(true);
      expect(feature.withArgs('monitoring').calledOnce).to.be(true);
      expect(getLicenseCheckResults.calledOnce).to.be(true);
    });

    it('verifyMonitoringLicense returns true if enabled by configuration and by license', () => {
      const get = sinon
        .stub()
        .withArgs('xpack.monitoring.cluster_alerts.enabled')
        .returns(true);
      const server = {
        config: sinon.stub().returns({ get }),
        plugins: { monitoring: { info: {} } },
      };
      const getLicenseCheckResults = sinon.stub().returns({ clusterAlerts: { enabled: true } });
      const feature = sinon
        .stub()
        .withArgs('monitoring')
        .returns({ getLicenseCheckResults });

      server.plugins.monitoring.info = { feature };

      const verification = verifyMonitoringLicense(server);

      expect(verification.enabled).to.be(true);
      expect(verification.message).to.be.undefined;

      expect(get.withArgs('xpack.monitoring.cluster_alerts.enabled').calledOnce).to.be(true);
      expect(feature.withArgs('monitoring').calledOnce).to.be(true);
      expect(getLicenseCheckResults.calledOnce).to.be(true);
    });
  });

  it('Monitoring feature info cannot be determined', () => {
    const get = sinon
      .stub()
      .withArgs('xpack.monitoring.cluster_alerts.enabled')
      .returns(true);
    const server = {
      config: sinon.stub().returns({ get }),
      plugins: { monitoring: undefined }, // simulate race condition
    };

    const verification = verifyMonitoringLicense(server);

    expect(verification.enabled).to.be(false);
    expect(verification.message).to.be('Status of Cluster Alerts feature could not be determined.');

    expect(get.withArgs('xpack.monitoring.cluster_alerts.enabled').calledOnce).to.be(true);
  });
});
