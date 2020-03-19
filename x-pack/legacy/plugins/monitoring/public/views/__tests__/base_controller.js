/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { spy, stub } from 'sinon';
import expect from '@kbn/expect';
import { MonitoringViewBaseController } from '../';
import { timefilter } from 'plugins/monitoring/np_imports/ui/timefilter';
import { PromiseWithCancel, Status } from '../../../common/cancel_promise';

/*
 * Mostly copied from base_table_controller test, with modifications
 */
describe('MonitoringViewBaseController', function() {
  let ctrl;
  let $injector;
  let $scope;
  let opts;
  let titleService;
  let executorService;
  let configService;
  const httpCall = ms => new Promise(resolve => setTimeout(() => resolve(), ms));

  before(() => {
    titleService = spy();
    executorService = {
      register: spy(),
      start: spy(),
      cancel: spy(),
      run: spy(),
    };
    configService = {
      get: spy(),
    };

    const windowMock = () => {
      const events = {};
      const targetEvent = 'popstate';
      return {
        removeEventListener: stub(),
        addEventListener: (name, handler) => name === targetEvent && (events[name] = handler),
        history: {
          back: () => events[targetEvent] && events[targetEvent](),
        },
      };
    };

    const injectorGetStub = stub();
    injectorGetStub.withArgs('title').returns(titleService);
    injectorGetStub.withArgs('$executor').returns(executorService);
    injectorGetStub
      .withArgs('localStorage')
      .throws('localStorage should not be used by this class');
    injectorGetStub.withArgs('$window').returns(windowMock());
    injectorGetStub.withArgs('config').returns(configService);
    $injector = { get: injectorGetStub };

    $scope = {
      cluster: { cluster_uuid: 'foo' },
      $on: stub(),
      $apply: stub(),
    };

    opts = {
      title: 'testo',
      getPageData: () => Promise.resolve({ data: { test: true } }),
      $injector,
      $scope,
    };

    ctrl = new MonitoringViewBaseController(opts);
  });

  it('show/hide zoom-out button based on interaction', done => {
    const xaxis = { from: 1562089923880, to: 1562090159676 };
    const timeRange = { xaxis };
    const { zoomInfo } = ctrl;

    ctrl.onBrush(timeRange);

    expect(zoomInfo.showZoomOutBtn()).to.be(true);

    /*
      Need to do this async, since we are delaying event adding
    */
    setTimeout(() => {
      zoomInfo.zoomOutHandler();
      expect(zoomInfo.showZoomOutBtn()).to.be(false);
      done();
    }, 15);
  });

  it('creates functions for fetching data', () => {
    expect(ctrl.updateData).to.be.a('function');
    expect(ctrl.onBrush).to.be.a('function');
  });

  it('sets page title', () => {
    expect(titleService.calledOnce).to.be(true);
    const { args } = titleService.getCall(0);
    expect(args).to.eql([{ cluster_uuid: 'foo' }, 'testo']);
  });

  it('starts data poller', () => {
    expect(executorService.register.calledOnce).to.be(true);
    expect(executorService.start.calledOnce).to.be(true);
  });

  it('does not allow for a new request if one is inflight', done => {
    let counter = 0;
    const opts = {
      title: 'testo',
      getPageData: ms => httpCall(ms),
      $injector,
      $scope,
    };

    const ctrl = new MonitoringViewBaseController(opts);
    ctrl.updateData(30).then(() => ++counter);
    ctrl.updateData(60).then(() => {
      expect(counter).to.be(0);
      done();
    });
  });

  describe('time filter', () => {
    it('enables timepicker and auto refresh #1', () => {
      expect(timefilter.isTimeRangeSelectorEnabled()).to.be(true);
      expect(timefilter.isAutoRefreshSelectorEnabled()).to.be(true);
    });

    it('enables timepicker and auto refresh #2', () => {
      opts = {
        ...opts,
        options: {},
      };
      ctrl = new MonitoringViewBaseController(opts);

      expect(timefilter.isTimeRangeSelectorEnabled()).to.be(true);
      expect(timefilter.isAutoRefreshSelectorEnabled()).to.be(true);
    });

    it('disables timepicker and enables auto refresh', () => {
      opts = {
        ...opts,
        options: { enableTimeFilter: false },
      };
      ctrl = new MonitoringViewBaseController(opts);

      expect(timefilter.isTimeRangeSelectorEnabled()).to.be(false);
      expect(timefilter.isAutoRefreshSelectorEnabled()).to.be(true);
    });

    it('enables timepicker and disables auto refresh', () => {
      opts = {
        ...opts,
        options: { enableAutoRefresh: false },
      };
      ctrl = new MonitoringViewBaseController(opts);

      expect(timefilter.isTimeRangeSelectorEnabled()).to.be(true);
      expect(timefilter.isAutoRefreshSelectorEnabled()).to.be(false);
    });

    it('disables timepicker and auto refresh', () => {
      opts = {
        ...opts,
        options: {
          enableTimeFilter: false,
          enableAutoRefresh: false,
        },
      };
      ctrl = new MonitoringViewBaseController(opts);

      expect(timefilter.isTimeRangeSelectorEnabled()).to.be(false);
      expect(timefilter.isAutoRefreshSelectorEnabled()).to.be(false);
    });

    it('disables timepicker and auto refresh', done => {
      opts = {
        title: 'test',
        getPageData: () => httpCall(60),
        $injector,
        $scope,
      };

      ctrl = new MonitoringViewBaseController({ ...opts });
      ctrl.updateDataPromise = new PromiseWithCancel(httpCall(50));

      let shouldBeFalse = false;
      ctrl.updateDataPromise.promise().then(() => (shouldBeFalse = true));

      const lastUpdateDataPromise = ctrl.updateDataPromise;

      ctrl.updateData().then(() => {
        expect(shouldBeFalse).to.be(false);
        expect(lastUpdateDataPromise.status()).to.be(Status.Canceled);
        done();
      });
    });
  });
});
