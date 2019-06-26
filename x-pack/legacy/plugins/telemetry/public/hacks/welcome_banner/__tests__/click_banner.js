/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import { uiModules } from 'ui/modules';

uiModules.get('kibana')
  // disable stat reporting while running tests,
  // MockInjector used in these tests is not impacted
  .constant('telemetryOptedIn', null);

import {
  clickBanner,
} from '../click_banner';
import { TelemetryOptInProvider } from '../../../services/telemetry_opt_in';

const getMockInjector = ({ simulateFailure }) => {
  const get = sinon.stub();

  get.withArgs('telemetryOptedIn').returns(null);

  const mockHttp = {
    post: sinon.stub()
  };

  if (simulateFailure) {
    mockHttp.post.returns(Promise.reject(new Error('something happened')));
  } else {
    mockHttp.post.returns(Promise.resolve({}));
  }

  get.withArgs('$http').returns(mockHttp);

  return { get };
};

const getTelemetryOptInProvider = ({ simulateFailure = false, simulateError = false } = {}) => {
  const injector = getMockInjector({ simulateFailure });
  const chrome = {
    addBasePath: (url) => url
  };

  const provider = new TelemetryOptInProvider(injector, chrome);

  if (simulateError) {
    provider.setOptIn = () => Promise.reject('unhandled error');
  }

  return provider;
};

describe('click_banner', () => {

  it('sets setting successfully and removes banner', async () => {
    const banners = {
      remove: sinon.spy()
    };

    const telemetryOptInProvider = getTelemetryOptInProvider();

    const bannerId = 'bruce-banner';
    const optIn = true;

    await clickBanner(bannerId, telemetryOptInProvider, optIn, { _banners: banners });

    expect(telemetryOptInProvider.getOptIn()).to.be(optIn);
    expect(banners.remove.calledOnce).to.be(true);
    expect(banners.remove.calledWith(bannerId)).to.be(true);
  });

  it('sets setting unsuccessfully, adds toast, and does not touch banner', async () => {
    const toastNotifications = {
      addDanger: sinon.spy()
    };
    const banners = {
      remove: sinon.spy()
    };
    const telemetryOptInProvider = getTelemetryOptInProvider({ simulateFailure: true });
    const bannerId = 'bruce-banner';
    const optIn = true;

    await clickBanner(bannerId, telemetryOptInProvider, optIn, { _banners: banners, _toastNotifications: toastNotifications });

    expect(telemetryOptInProvider.getOptIn()).to.be(null);
    expect(toastNotifications.addDanger.calledOnce).to.be(true);
    expect(banners.remove.notCalled).to.be(true);
  });

  it('sets setting unsuccessfully with error, adds toast, and does not touch banner', async () => {
    const toastNotifications = {
      addDanger: sinon.spy()
    };
    const banners = {
      remove: sinon.spy()
    };
    const telemetryOptInProvider = getTelemetryOptInProvider({ simulateError: true });
    const bannerId = 'bruce-banner';
    const optIn = false;

    await clickBanner(bannerId, telemetryOptInProvider, optIn, { _banners: banners, _toastNotifications: toastNotifications });

    expect(telemetryOptInProvider.getOptIn()).to.be(null);
    expect(toastNotifications.addDanger.calledOnce).to.be(true);
    expect(banners.remove.notCalled).to.be(true);
  });

});
