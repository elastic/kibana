/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockInjectedMetadata } from '../../services/telemetry_opt_in.test.mocks';

import sinon from 'sinon';

import { CONFIG_TELEMETRY } from '../../../common/constants';
import { shouldShowBanner } from './should_show_banner';
import { TelemetryOptInProvider } from '../../services/telemetry_opt_in';

const getMockInjector = () => {
  const get = sinon.stub();

  const mockHttp = {
    post: sinon.stub()
  };

  get.withArgs('$http').returns(mockHttp);

  return { get };
};

const getTelemetryOptInProvider = ({ telemetryOptedIn = null } = {}) => {
  mockInjectedMetadata({ telemetryOptedIn });
  const injector = getMockInjector();
  const chrome = {
    addBasePath: (url) => url
  };

  return new TelemetryOptInProvider(injector, chrome);
};

describe('should_show_banner', () => {

  it('returns whatever handleOldSettings does when telemetry opt-in setting is unset', async () => {
    const config = { get: sinon.stub() };
    const telemetryOptInProvider = getTelemetryOptInProvider();
    const handleOldSettingsTrue = sinon.stub();
    const handleOldSettingsFalse = sinon.stub();

    config.get.withArgs(CONFIG_TELEMETRY, null).returns(null);
    handleOldSettingsTrue.returns(Promise.resolve(true));
    handleOldSettingsFalse.returns(Promise.resolve(false));

    const showBannerTrue = await shouldShowBanner(telemetryOptInProvider, config, { _handleOldSettings: handleOldSettingsTrue });
    const showBannerFalse = await shouldShowBanner(telemetryOptInProvider, config, { _handleOldSettings: handleOldSettingsFalse });

    expect(showBannerTrue).toBe(true);
    expect(showBannerFalse).toBe(false);

    expect(config.get.callCount).toBe(0);
    expect(handleOldSettingsTrue.calledOnce).toBe(true);
    expect(handleOldSettingsFalse.calledOnce).toBe(true);
  });

  it('returns false if telemetry opt-in setting is set to true', async () => {
    const config = { get: sinon.stub() };

    const telemetryOptInProvider = getTelemetryOptInProvider({ telemetryOptedIn: true });

    expect(await shouldShowBanner(telemetryOptInProvider, config)).toBe(false);
  });

  it('returns false if telemetry opt-in setting is set to false', async () => {
    const config = { get: sinon.stub() };

    const telemetryOptInProvider = getTelemetryOptInProvider({ telemetryOptedIn: false });

    expect(await shouldShowBanner(telemetryOptInProvider, config)).toBe(false);
  });

});
