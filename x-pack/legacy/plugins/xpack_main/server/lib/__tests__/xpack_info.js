/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHash } from 'crypto';
import { BehaviorSubject } from 'rxjs';
import expect from '@kbn/expect';
import sinon from 'sinon';
import { XPackInfo } from '../xpack_info';
import { licensingMock } from '../../../../../../plugins/licensing/server/mocks';

function createLicense(license = {}, features = {}) {
  return licensingMock.createLicense({
    license: {
      uid: 'custom-uid',
      type: 'gold',
      mode: 'gold',
      status: 'active',
      expiryDateInMillis: 1286575200000,
      ...license,
    },
    features: {
      security: {
        description: 'Security for the Elastic Stack',
        isAvailable: true,
        isEnabled: true,
      },
      watcher: {
        description: 'Alerting, Notification and Automation for the Elastic Stack',
        isAvailable: true,
        isEnabled: false,
      },
      ...features,
    },
  });
}

function getSignature(object) {
  return createHash('md5')
    .update(JSON.stringify(object))
    .digest('hex');
}

describe('XPackInfo', () => {
  let mockServer;
  let mockElasticsearchPlugin;

  beforeEach(() => {
    mockServer = sinon.stub({
      plugins: { elasticsearch: mockElasticsearchPlugin },
      events: { on() {} },
      newPlatform: {
        setup: {
          plugins: {
            licensing: {},
          },
        },
      },
    });
  });

  describe('refreshNow()', () => {
    it('delegates to the new platform licensing plugin', async () => {
      const refresh = sinon.spy();

      const xPackInfo = new XPackInfo(mockServer, {
        licensing: {
          license$: new BehaviorSubject(createLicense()),
          refresh: refresh,
        },
      });

      await xPackInfo.refreshNow();

      sinon.assert.calledOnce(refresh);
    });
  });

  describe('license', () => {
    let xPackInfo;
    let license$;
    beforeEach(async () => {
      license$ = new BehaviorSubject(createLicense());
      xPackInfo = new XPackInfo(mockServer, {
        licensing: {
          license$,
          refresh: () => null,
        },
      });
    });

    it('getUid() shows license uid returned from the license$.', async () => {
      expect(xPackInfo.license.getUid()).to.be('custom-uid');

      license$.next(createLicense({ uid: 'new-custom-uid' }));

      expect(xPackInfo.license.getUid()).to.be('new-custom-uid');

      license$.next(createLicense({ uid: undefined, error: 'error-reason' }));

      expect(xPackInfo.license.getUid()).to.be(undefined);
    });

    it('isActive() is based on the status returned from the backend.', async () => {
      expect(xPackInfo.license.isActive()).to.be(true);

      license$.next(createLicense({ status: 'expired' }));
      expect(xPackInfo.license.isActive()).to.be(false);

      license$.next(createLicense({ status: 'some other value' }));
      expect(xPackInfo.license.isActive()).to.be(false);

      license$.next(createLicense({ status: 'active' }));
      expect(xPackInfo.license.isActive()).to.be(true);

      license$.next(createLicense({ status: undefined, error: 'error-reason' }));
      expect(xPackInfo.license.isActive()).to.be(false);
    });

    it('getExpiryDateInMillis() is based on the value returned from the backend.', async () => {
      expect(xPackInfo.license.getExpiryDateInMillis()).to.be(1286575200000);

      license$.next(createLicense({ expiryDateInMillis: 10203040 }));
      expect(xPackInfo.license.getExpiryDateInMillis()).to.be(10203040);

      license$.next(createLicense({ expiryDateInMillis: undefined, error: 'error-reason' }));
      expect(xPackInfo.license.getExpiryDateInMillis()).to.be(undefined);
    });

    it('getType() is based on the value returned from the backend.', async () => {
      expect(xPackInfo.license.getType()).to.be('gold');

      license$.next(createLicense({ type: 'basic' }));
      expect(xPackInfo.license.getType()).to.be('basic');

      license$.next(createLicense({ type: undefined, error: 'error-reason' }));
      expect(xPackInfo.license.getType()).to.be(undefined);
    });

    it('isOneOf() correctly determines if current license is presented in the specified list.', async () => {
      expect(xPackInfo.license.isOneOf('gold')).to.be(true);
      expect(xPackInfo.license.isOneOf(['gold', 'basic'])).to.be(true);
      expect(xPackInfo.license.isOneOf(['platinum', 'basic'])).to.be(false);
      expect(xPackInfo.license.isOneOf('standard')).to.be(false);

      license$.next(createLicense({ mode: 'basic' }));

      expect(xPackInfo.license.isOneOf('basic')).to.be(true);
      expect(xPackInfo.license.isOneOf(['gold', 'basic'])).to.be(true);
      expect(xPackInfo.license.isOneOf(['platinum', 'gold'])).to.be(false);
      expect(xPackInfo.license.isOneOf('standard')).to.be(false);
    });
  });

  describe('feature', () => {
    let xPackInfo;
    let license$;
    beforeEach(async () => {
      license$ = new BehaviorSubject(
        createLicense(
          {},
          {
            feature: {
              isAvailable: false,
              isEnabled: true,
            },
          }
        )
      );
      xPackInfo = new XPackInfo(mockServer, {
        licensing: {
          license$,
          refresh: () => null,
        },
      });
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

      securityFeature.registerLicenseCheckResultsGenerator(info => {
        return {
          isXPackInfo: info instanceof XPackInfo,
          license: info.license.getType(),
          someCustomValue: 100500,
        };
      });

      expect(xPackInfo.toJSON().features.security).to.eql({
        isXPackInfo: true,
        license: 'gold',
        someCustomValue: 100500,
      });
      expect(xPackInfo.toJSON().features.watcher).to.be(undefined);

      watcherFeature.registerLicenseCheckResultsGenerator(info => {
        return {
          isXPackInfo: info instanceof XPackInfo,
          license: info.license.getType(),
          someAnotherCustomValue: 500100,
        };
      });

      expect(xPackInfo.toJSON().features.security).to.eql({
        isXPackInfo: true,
        license: 'gold',
        someCustomValue: 100500,
      });
      expect(xPackInfo.toJSON().features.watcher).to.eql({
        isXPackInfo: true,
        license: 'gold',
        someAnotherCustomValue: 500100,
      });

      license$.next(createLicense({ type: 'platinum' }));

      expect(xPackInfo.toJSON().features.security).to.eql({
        isXPackInfo: true,
        license: 'platinum',
        someCustomValue: 100500,
      });
      expect(xPackInfo.toJSON().features.watcher).to.eql({
        isXPackInfo: true,
        license: 'platinum',
        someAnotherCustomValue: 500100,
      });
    });

    it('getLicenseCheckResults() correctly returns feature specific info.', async () => {
      const securityFeature = xPackInfo.feature('security');
      const watcherFeature = xPackInfo.feature('watcher');

      expect(securityFeature.getLicenseCheckResults()).to.be(undefined);
      expect(watcherFeature.getLicenseCheckResults()).to.be(undefined);

      securityFeature.registerLicenseCheckResultsGenerator(info => {
        return {
          isXPackInfo: info instanceof XPackInfo,
          license: info.license.getType(),
          someCustomValue: 100500,
        };
      });

      expect(securityFeature.getLicenseCheckResults()).to.eql({
        isXPackInfo: true,
        license: 'gold',
        someCustomValue: 100500,
      });
      expect(watcherFeature.getLicenseCheckResults()).to.be(undefined);

      watcherFeature.registerLicenseCheckResultsGenerator(info => {
        return {
          isXPackInfo: info instanceof XPackInfo,
          license: info.license.getType(),
          someAnotherCustomValue: 500100,
        };
      });

      expect(securityFeature.getLicenseCheckResults()).to.eql({
        isXPackInfo: true,
        license: 'gold',
        someCustomValue: 100500,
      });
      expect(watcherFeature.getLicenseCheckResults()).to.eql({
        isXPackInfo: true,
        license: 'gold',
        someAnotherCustomValue: 500100,
      });

      license$.next(createLicense({ type: 'platinum' }));

      expect(securityFeature.getLicenseCheckResults()).to.eql({
        isXPackInfo: true,
        license: 'platinum',
        someCustomValue: 100500,
      });
      expect(watcherFeature.getLicenseCheckResults()).to.eql({
        isXPackInfo: true,
        license: 'platinum',
        someAnotherCustomValue: 500100,
      });
    });
  });

  it('onLicenseInfoChange() allows to subscribe to license update', async () => {
    const license$ = new BehaviorSubject(createLicense());

    const xPackInfo = new XPackInfo(mockServer, {
      licensing: {
        license$,
        refresh: () => null,
      },
    });

    const watcherFeature = xPackInfo.feature('watcher');
    watcherFeature.registerLicenseCheckResultsGenerator(info => ({
      type: info.license.getType(),
    }));

    const statuses = [];
    xPackInfo.onLicenseInfoChange(() => statuses.push(watcherFeature.getLicenseCheckResults()));

    license$.next(createLicense({ type: 'basic' }));
    expect(statuses).to.eql([{ type: 'basic' }]);

    license$.next(createLicense({ type: 'trial' }));
    expect(statuses).to.eql([{ type: 'basic' }, { type: 'trial' }]);
  });

  it('refreshNow() leads to onLicenseInfoChange()', async () => {
    const license$ = new BehaviorSubject(createLicense());

    const xPackInfo = new XPackInfo(mockServer, {
      licensing: {
        license$,
        refresh: () => license$.next({ type: 'basic' }),
      },
    });

    const watcherFeature = xPackInfo.feature('watcher');

    watcherFeature.registerLicenseCheckResultsGenerator(info => ({
      type: info.license.getType(),
    }));

    const statuses = [];
    xPackInfo.onLicenseInfoChange(() => statuses.push(watcherFeature.getLicenseCheckResults()));

    await xPackInfo.refreshNow();
    expect(statuses).to.eql([{ type: 'basic' }]);
  });

  it('getSignature() returns correct signature.', async () => {
    const license$ = new BehaviorSubject(createLicense());
    const xPackInfo = new XPackInfo(mockServer, {
      licensing: {
        license$,
        refresh: () => null,
      },
    });

    expect(xPackInfo.getSignature()).to.be(
      getSignature({
        license: {
          type: 'gold',
          isActive: true,
          expiryDateInMillis: 1286575200000,
        },
        features: {},
      })
    );

    license$.next(createLicense({ type: 'platinum', expiryDateInMillis: 20304050 }));

    const expectedSignature = getSignature({
      license: {
        type: 'platinum',
        isActive: true,
        expiryDateInMillis: 20304050,
      },
      features: {},
    });
    expect(xPackInfo.getSignature()).to.be(expectedSignature);

    // Should stay the same after refresh if nothing changed.
    license$.next(createLicense({ type: 'platinum', expiryDateInMillis: 20304050 }));

    expect(xPackInfo.getSignature()).to.be(expectedSignature);
  });
});
