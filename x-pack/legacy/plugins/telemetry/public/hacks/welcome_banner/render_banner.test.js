/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderBanner } from './render_banner';

describe('render_banner', () => {

  it('adds a banner to banners with priority of 10000', () => {
    const bannerID = 'brucer-banner';

    const telemetryOptInProvider = { setBannerId: jest.fn() };
    const banners = { add: jest.fn().mockReturnValue(bannerID) };
    const fetchTelemetry = jest.fn();

    renderBanner(telemetryOptInProvider, fetchTelemetry, { _banners: banners });

    expect(banners.add).toBeCalledTimes(1);
    expect(fetchTelemetry).toBeCalledTimes(0);
    expect(telemetryOptInProvider.setBannerId).toBeCalledWith(bannerID);

    const bannerConfig = banners.add.mock.calls[0][0];

    expect(bannerConfig.component).not.toBe(undefined);
    expect(bannerConfig.priority).toBe(10000);
  });

});
