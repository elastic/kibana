/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';

import { renderBanner } from '../render_banner';

describe('render_banner', () => {

  it('adds a banner to banners with priority of 10000', () => {
    const config = { };
    const banners = {
      add: sinon.stub()
    };
    const fetchTelemetry = sinon.stub();
    banners.add.returns('brucer-banner');

    renderBanner(config, fetchTelemetry, { _banners: banners });

    expect(banners.add.calledOnce).to.be(true);
    expect(fetchTelemetry.called).to.be(false);

    const bannerConfig = banners.add.getCall(0).args[0];

    expect(bannerConfig.component).not.to.be(undefined);
    expect(bannerConfig.priority).to.be(10000);
  });

});
