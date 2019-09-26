/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHash } from 'crypto';
import expect from '@kbn/expect';
import sinon from 'sinon';
import { XPackInfo } from '../xpack_info';

const nowDate = new Date(2010, 10, 10);

function getMockXPackInfoAPIResponse(license = {}, features = {}) {
  return Promise.resolve({
    build: {
      hash: '5927d85',
      date: '2010-10-10T00:00:00.000Z'
    },
    license: {
      uid: 'custom-uid',
      type: 'gold',
      mode: 'gold',
      status: 'active',
      expiry_date_in_millis: 1286575200000,
      ...license
    },
    features: {
      security: {
        description: 'Security for the Elastic Stack',
        available: true,
        enabled: true
      },
      watcher: {
        description: 'Alerting, Notification and Automation for the Elastic Stack',
        available: true,
        enabled: false
      },
      ...features
    }
  });
}

function getSignature(object) {
  return createHash('md5')
    .update(JSON.stringify(object))
    .digest('hex');
}

describe('XPackInfo', () => {
  const sandbox = sinon.createSandbox();

  let mockServer;
  let mockElasticsearchCluster;
  let mockElasticsearchPlugin;

  beforeEach(() => {
    sandbox.useFakeTimers(nowDate.getTime());

    mockElasticsearchCluster = {
      callWithInternalUser: sinon.stub()
    };

    mockElasticsearchPlugin = {
      getCluster: sinon.stub().returns(mockElasticsearchCluster)
    };

    mockServer = sinon.stub({
      plugins: { elasticsearch: mockElasticsearchPlugin },
      events: { on() {} },
      log() { }
    });
  });

  afterEach(() => sandbox.restore());

  it('correctly initializes its own properties with defaults.', () => {
    mockElasticsearchPlugin.getCluster.throws(new Error('`getCluster` is called with unexpected source.'));
    mockElasticsearchPlugin.getCluster.withArgs('data').returns(mockElasticsearchCluster);

    const xPackInfo = new XPackInfo(mockServer, { pollFrequencyInMillis: 1500 });

    expect(xPackInfo.isAvailable()).to.be(false);
    expect(xPackInfo.license.isActive()).to.be(false);
    expect(xPackInfo.unavailableReason()).to.be(undefined);

    // Poller is not started.
    sandbox.clock.tick(10000);
    sinon.assert.notCalled(mockElasticsearchCluster.callWithInternalUser);
  });

  it('correctly initializes its own properties with custom cluster type.', () => {
    mockElasticsearchPlugin.getCluster.throws(new Error('`getCluster` is called with unexpected source.'));
    mockElasticsearchPlugin.getCluster.withArgs('monitoring').returns(mockElasticsearchCluster);

    const xPackInfo = new XPackInfo(
      mockServer,
      { clusterSource: 'monitoring', pollFrequencyInMillis: 1234 }
    );

    expect(xPackInfo.isAvailable()).to.be(false);
    expect(xPackInfo.license.isActive()).to.be(false);
    expect(xPackInfo.unavailableReason()).to.be(undefined);

    // Poller is not started.
    sandbox.clock.tick(9999);
    sinon.assert.notCalled(mockElasticsearchCluster.callWithInternalUser);
  });

  describe('refreshNow()', () => {
    let xPackInfo;
    beforeEach(async () => {
      mockElasticsearchCluster.callWithInternalUser.returns(getMockXPackInfoAPIResponse());

      xPackInfo = new XPackInfo(mockServer, { pollFrequencyInMillis: 1500 });
      await xPackInfo.refreshNow();
    });

    it('forces xpack info to be immediately updated with the data returned from Elasticsearch API.', async () => {
      sinon.assert.calledOnce(mockElasticsearchCluster.callWithInternalUser);
      sinon.assert.calledWithExactly(mockElasticsearchCluster.callWithInternalUser, 'transport.request', {
        method: 'GET',
        path: '/_xpack'
      });

      expect(xPackInfo.isAvailable()).to.be(true);
      expect(xPackInfo.license.isActive()).to.be(true);
    });


    it('communicates X-Pack being unavailable', async () => {
      const badRequestError = new Error('Bad request');
      badRequestError.status = 400;

      mockElasticsearchCluster.callWithInternalUser.returns(Promise.reject(badRequestError));
      await xPackInfo.refreshNow();

      expect(xPackInfo.isAvailable()).to.be(false);
      expect(xPackInfo.isXpackUnavailable()).to.be(true);
      expect(xPackInfo.license.isActive()).to.be(false);
      expect(xPackInfo.unavailableReason()).to.be(
        'X-Pack plugin is not installed on the [data] Elasticsearch cluster.'
      );
    });

    it('correctly updates xpack info if Elasticsearch API fails.', async () => {
      expect(xPackInfo.isAvailable()).to.be(true);
      expect(xPackInfo.license.isActive()).to.be(true);

      mockElasticsearchCluster.callWithInternalUser.returns(Promise.reject(new Error('Uh oh')));
      await xPackInfo.refreshNow();

      expect(xPackInfo.isAvailable()).to.be(false);
      expect(xPackInfo.license.isActive()).to.be(false);
    });

    it('correctly updates xpack info when Elasticsearch API recovers after failure.', async () => {
      expect(xPackInfo.isAvailable()).to.be(true);
      expect(xPackInfo.license.isActive()).to.be(true);
      expect(xPackInfo.unavailableReason()).to.be(undefined);

      const randomError = new Error('Uh oh');
      mockElasticsearchCluster.callWithInternalUser.returns(Promise.reject(randomError));
      await xPackInfo.refreshNow();

      expect(xPackInfo.isAvailable()).to.be(false);
      expect(xPackInfo.license.isActive()).to.be(false);
      expect(xPackInfo.unavailableReason()).to.be(randomError);
      sinon.assert.calledWithExactly(
        mockServer.log,
        ['license', 'warning', 'xpack'],
        `License information from the X-Pack plugin could not be obtained from Elasticsearch` +
        ` for the [data] cluster. ${randomError}`
      );

      const badRequestError = new Error('Bad request');
      badRequestError.status = 400;
      mockElasticsearchCluster.callWithInternalUser.returns(Promise.reject(badRequestError));
      await xPackInfo.refreshNow();

      expect(xPackInfo.isAvailable()).to.be(false);
      expect(xPackInfo.license.isActive()).to.be(false);
      expect(xPackInfo.unavailableReason()).to.be(
        'X-Pack plugin is not installed on the [data] Elasticsearch cluster.'
      );
      sinon.assert.calledWithExactly(
        mockServer.log,
        ['license', 'warning', 'xpack'],
        `License information from the X-Pack plugin could not be obtained from Elasticsearch` +
        ` for the [data] cluster. ${badRequestError}`
      );

      mockElasticsearchCluster.callWithInternalUser.returns(getMockXPackInfoAPIResponse());
      await xPackInfo.refreshNow();

      expect(xPackInfo.isAvailable()).to.be(true);
      expect(xPackInfo.license.isActive()).to.be(true);
    });

    it('logs license status changes.', async () => {
      sinon.assert.calledWithExactly(
        mockServer.log,
        ['license', 'info', 'xpack'],
        sinon.match('Imported license information from Elasticsearch for the [data] cluster: ' +
          'mode: gold | status: active | expiry date: '
        )
      );
      mockServer.log.resetHistory();

      await xPackInfo.refreshNow();

      // Response is still the same, so nothing should be logged.
      sinon.assert.neverCalledWith(mockServer.log, ['license', 'info', 'xpack']);

      // Change mode/status of the license and the change should be logged.
      mockElasticsearchCluster.callWithInternalUser.returns(
        getMockXPackInfoAPIResponse({ status: 'expired', mode: 'platinum' })
      );

      await xPackInfo.refreshNow();

      sinon.assert.calledWithExactly(
        mockServer.log,
        ['license', 'info', 'xpack'],
        sinon.match('Imported changed license information from Elasticsearch for the [data] cluster: ' +
          'mode: platinum | status: expired | expiry date: '
        )
      );
    });

    it('restarts the poller.', async () => {
      mockElasticsearchCluster.callWithInternalUser.resetHistory();

      sandbox.clock.tick(1499);
      sinon.assert.notCalled(mockElasticsearchCluster.callWithInternalUser);

      sandbox.clock.tick(1);
      sinon.assert.calledOnce(mockElasticsearchCluster.callWithInternalUser);
      // Exhaust micro-task queue, to make sure that `callWithInternalUser` is completed and
      // new poller iteration is rescheduled.
      await Promise.resolve();

      sandbox.clock.tick(1500);
      sinon.assert.calledTwice(mockElasticsearchCluster.callWithInternalUser);
      // Exhaust micro-task queue, to make sure that `callWithInternalUser` is completed and
      // new poller iteration is rescheduled.
      await Promise.resolve();

      sandbox.clock.tick(1499);
      await xPackInfo.refreshNow();
      mockElasticsearchCluster.callWithInternalUser.resetHistory();

      // Since poller has been restarted, it should not be called now.
      sandbox.clock.tick(1);
      sinon.assert.notCalled(mockElasticsearchCluster.callWithInternalUser);

      // Here it still shouldn't be called.
      sandbox.clock.tick(1498);
      sinon.assert.notCalled(mockElasticsearchCluster.callWithInternalUser);

      sandbox.clock.tick(1);
      sinon.assert.calledOnce(mockElasticsearchCluster.callWithInternalUser);
    });
  });

  describe('license', () => {
    let xPackInfo;
    beforeEach(async () => {
      mockElasticsearchCluster.callWithInternalUser.returns(getMockXPackInfoAPIResponse());

      xPackInfo = new XPackInfo(mockServer, { pollFrequencyInMillis: 1500 });
      await xPackInfo.refreshNow();
    });

    it('getUid() shows license uid returned from the backend.', async () => {
      expect(xPackInfo.license.getUid()).to.be('custom-uid');

      mockElasticsearchCluster.callWithInternalUser.returns(
        getMockXPackInfoAPIResponse({ uid: 'new-custom-uid' })
      );
      await xPackInfo.refreshNow();

      expect(xPackInfo.license.getUid()).to.be('new-custom-uid');

      mockElasticsearchCluster.callWithInternalUser.returns(
        Promise.reject(new Error('Uh oh'))
      );
      await xPackInfo.refreshNow();

      expect(xPackInfo.license.getUid()).to.be(undefined);
    });

    it('isActive() is based on the status returned from the backend.', async () => {
      expect(xPackInfo.license.isActive()).to.be(true);

      mockElasticsearchCluster.callWithInternalUser.returns(
        getMockXPackInfoAPIResponse({ status: 'expired' })
      );
      await xPackInfo.refreshNow();

      expect(xPackInfo.license.isActive()).to.be(false);

      mockElasticsearchCluster.callWithInternalUser.returns(
        getMockXPackInfoAPIResponse({ status: 'some other value' })
      );
      await xPackInfo.refreshNow();

      expect(xPackInfo.license.isActive()).to.be(false);

      mockElasticsearchCluster.callWithInternalUser.returns(
        getMockXPackInfoAPIResponse({ status: 'active' })
      );
      await xPackInfo.refreshNow();

      expect(xPackInfo.license.isActive()).to.be(true);

      mockElasticsearchCluster.callWithInternalUser.returns(
        Promise.reject(new Error('Uh oh'))
      );
      await xPackInfo.refreshNow();

      expect(xPackInfo.license.isActive()).to.be(false);
    });

    it('getExpiryDateInMillis() is based on the value returned from the backend.', async () => {
      expect(xPackInfo.license.getExpiryDateInMillis()).to.be(1286575200000);

      mockElasticsearchCluster.callWithInternalUser.returns(
        getMockXPackInfoAPIResponse({ expiry_date_in_millis: 10203040 })
      );
      await xPackInfo.refreshNow();

      expect(xPackInfo.license.getExpiryDateInMillis()).to.be(10203040);

      mockElasticsearchCluster.callWithInternalUser.returns(
        Promise.reject(new Error('Uh oh'))
      );
      await xPackInfo.refreshNow();

      expect(xPackInfo.license.getExpiryDateInMillis()).to.be(undefined);
    });

    it('getType() is based on the value returned from the backend.', async () => {
      expect(xPackInfo.license.getType()).to.be('gold');

      mockElasticsearchCluster.callWithInternalUser.returns(
        getMockXPackInfoAPIResponse({ type: 'basic' })
      );
      await xPackInfo.refreshNow();

      expect(xPackInfo.license.getType()).to.be('basic');

      mockElasticsearchCluster.callWithInternalUser.returns(
        Promise.reject(new Error('Uh oh'))
      );
      await xPackInfo.refreshNow();

      expect(xPackInfo.license.getType()).to.be(undefined);
    });

    it('isOneOf() correctly determines if current license is presented in the specified list.', async () => {
      mockElasticsearchCluster.callWithInternalUser.returns(
        getMockXPackInfoAPIResponse({ mode: 'gold' })
      );
      await xPackInfo.refreshNow();

      expect(xPackInfo.license.isOneOf('gold')).to.be(true);
      expect(xPackInfo.license.isOneOf(['gold', 'basic'])).to.be(true);
      expect(xPackInfo.license.isOneOf(['platinum', 'basic'])).to.be(false);
      expect(xPackInfo.license.isOneOf('standard')).to.be(false);

      mockElasticsearchCluster.callWithInternalUser.returns(
        getMockXPackInfoAPIResponse({ mode: 'basic' })
      );
      await xPackInfo.refreshNow();

      expect(xPackInfo.license.isOneOf('basic')).to.be(true);
      expect(xPackInfo.license.isOneOf(['gold', 'basic'])).to.be(true);
      expect(xPackInfo.license.isOneOf(['platinum', 'gold'])).to.be(false);
      expect(xPackInfo.license.isOneOf('standard')).to.be(false);
    });
  });

  describe('feature', () => {
    let xPackInfo;
    beforeEach(async () => {
      mockElasticsearchCluster.callWithInternalUser.returns(
        getMockXPackInfoAPIResponse({}, {
          feature: {
            available: false,
            enabled: true
          }
        })
      );

      xPackInfo = new XPackInfo(mockServer, { pollFrequencyInMillis: 1500 });
      await xPackInfo.refreshNow();
    });

    it('isAvailable() checks whether particular feature is available.', async () => {
      const availableFeatureOne = xPackInfo.feature('security');
      const availableFeatureTwo = xPackInfo.feature('watcher');
      const unavailableFeatureOne = xPackInfo.feature('feature');
      const unavailableFeatureTwo = xPackInfo.feature('non-existing-feature');

      expect(availableFeatureOne.isAvailable()).to.be(true);
      expect(availableFeatureTwo.isAvailable()).to.be(true);
      expect(unavailableFeatureOne.isAvailable()).to.be(false);
      expect(unavailableFeatureTwo.isAvailable()).to.be(false);
    });

    it('isEnabled() checks whether particular feature is enabled.', async () => {
      const enabledFeatureOne = xPackInfo.feature('security');
      const enabledFeatureTwo = xPackInfo.feature('feature');
      const disabledFeatureOne = xPackInfo.feature('watcher');
      const disabledFeatureTwo = xPackInfo.feature('non-existing-feature');

      expect(enabledFeatureOne.isEnabled()).to.be(true);
      expect(enabledFeatureTwo.isEnabled()).to.be(true);
      expect(disabledFeatureOne.isEnabled()).to.be(false);
      expect(disabledFeatureTwo.isEnabled()).to.be(false);
    });

    it('registerLicenseCheckResultsGenerator() allows to fill in XPack Info feature specific info.', async () => {
      const securityFeature = xPackInfo.feature('security');
      const watcherFeature = xPackInfo.feature('watcher');

      expect(xPackInfo.toJSON().features.security).to.be(undefined);
      expect(xPackInfo.toJSON().features.watcher).to.be(undefined);

      securityFeature.registerLicenseCheckResultsGenerator((info) => {
        return {
          isXPackInfo: info instanceof XPackInfo,
          license: info.license.getType(),
          someCustomValue: 100500
        };
      });

      expect(xPackInfo.toJSON().features.security).to.eql({
        isXPackInfo: true,
        license: 'gold',
        someCustomValue: 100500
      });
      expect(xPackInfo.toJSON().features.watcher).to.be(undefined);

      watcherFeature.registerLicenseCheckResultsGenerator((info) => {
        return {
          isXPackInfo: info instanceof XPackInfo,
          license: info.license.getType(),
          someAnotherCustomValue: 500100
        };
      });

      expect(xPackInfo.toJSON().features.security).to.eql({
        isXPackInfo: true,
        license: 'gold',
        someCustomValue: 100500
      });
      expect(xPackInfo.toJSON().features.watcher).to.eql({
        isXPackInfo: true,
        license: 'gold',
        someAnotherCustomValue: 500100
      });

      mockElasticsearchCluster.callWithInternalUser.returns(
        getMockXPackInfoAPIResponse({ type: 'platinum' })
      );
      await xPackInfo.refreshNow();

      expect(xPackInfo.toJSON().features.security).to.eql({
        isXPackInfo: true,
        license: 'platinum',
        someCustomValue: 100500
      });
      expect(xPackInfo.toJSON().features.watcher).to.eql({
        isXPackInfo: true,
        license: 'platinum',
        someAnotherCustomValue: 500100
      });
    });

    it('getLicenseCheckResults() correctly returns feature specific info.', async () => {
      const securityFeature = xPackInfo.feature('security');
      const watcherFeature = xPackInfo.feature('watcher');

      expect(securityFeature.getLicenseCheckResults()).to.be(undefined);
      expect(watcherFeature.getLicenseCheckResults()).to.be(undefined);

      securityFeature.registerLicenseCheckResultsGenerator((info) => {
        return {
          isXPackInfo: info instanceof XPackInfo,
          license: info.license.getType(),
          someCustomValue: 100500
        };
      });

      expect(securityFeature.getLicenseCheckResults()).to.eql({
        isXPackInfo: true,
        license: 'gold',
        someCustomValue: 100500
      });
      expect(watcherFeature.getLicenseCheckResults()).to.be(undefined);

      watcherFeature.registerLicenseCheckResultsGenerator((info) => {
        return {
          isXPackInfo: info instanceof XPackInfo,
          license: info.license.getType(),
          someAnotherCustomValue: 500100
        };
      });

      expect(securityFeature.getLicenseCheckResults()).to.eql({
        isXPackInfo: true,
        license: 'gold',
        someCustomValue: 100500
      });
      expect(watcherFeature.getLicenseCheckResults()).to.eql({
        isXPackInfo: true,
        license: 'gold',
        someAnotherCustomValue: 500100
      });

      mockElasticsearchCluster.callWithInternalUser.returns(
        getMockXPackInfoAPIResponse({ type: 'platinum' })
      );
      await xPackInfo.refreshNow();

      expect(securityFeature.getLicenseCheckResults()).to.eql({
        isXPackInfo: true,
        license: 'platinum',
        someCustomValue: 100500
      });
      expect(watcherFeature.getLicenseCheckResults()).to.eql({
        isXPackInfo: true,
        license: 'platinum',
        someAnotherCustomValue: 500100
      });
    });
  });

  it('getSignature() returns correct signature.', async () => {
    mockElasticsearchCluster.callWithInternalUser.returns(getMockXPackInfoAPIResponse());
    const xPackInfo = new XPackInfo(mockServer, { pollFrequencyInMillis: 1500 });
    await xPackInfo.refreshNow();

    expect(xPackInfo.getSignature()).to.be(getSignature({
      license: {
        type: 'gold',
        isActive: true,
        expiryDateInMillis: 1286575200000
      },
      features: {}
    }));

    mockElasticsearchCluster.callWithInternalUser.returns(
      getMockXPackInfoAPIResponse({ type: 'platinum', expiry_date_in_millis: nowDate.getTime() })
    );

    await xPackInfo.refreshNow();

    const expectedSignature = getSignature({
      license: {
        type: 'platinum',
        isActive: true,
        expiryDateInMillis: nowDate.getTime()
      },
      features: {}
    });
    expect(xPackInfo.getSignature()).to.be(expectedSignature);

    // Should stay the same after refresh if nothing changed.
    await xPackInfo.refreshNow();
    expect(xPackInfo.getSignature()).to.be(expectedSignature);
  });
});
