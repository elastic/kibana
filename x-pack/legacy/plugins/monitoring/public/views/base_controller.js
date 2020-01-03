/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment';
import { render, unmountComponentAtNode } from 'react-dom';
import { getPageData } from '../lib/get_page_data';
import { PageLoading } from 'plugins/monitoring/components';
import { timefilter } from 'ui/timefilter';
import { I18nContext } from 'ui/i18n';
import { PromiseWithCancel } from '../../common/cancel_promise';
import { updateSetupModeData, getSetupModeState } from '../lib/setup_mode';

/**
 * Given a timezone, this function will calculate the offset in milliseconds
 * from UTC time.
 *
 * @param {string} timezone
 */
const getOffsetInMS = timezone => {
  if (timezone === 'Browser') {
    return 0;
  }
  const offsetInMinutes = moment.tz(timezone).utcOffset();
  const offsetInMS = offsetInMinutes * 1 * 60 * 1000;
  return offsetInMS;
};

/**
 * Class to manage common instantiation behaviors in a view controller
 *
 * This is expected to be extended, and behavior enabled using super();
 *
 * Example:
 * uiRoutes.when('/myRoute', {
 *   template: importedTemplate,
 *   controllerAs: 'myView',
 *   controller: class MyView extends MonitoringViewBaseController {
 *     constructor($injector, $scope) {
 *       super({
 *         title: 'Hello World',
 *         api: '../api/v1/monitoring/foo/bar',
 *         defaultData,
 *         reactNodeId,
 *         $scope,
 *         $injector,
 *         options: {
 *           enableTimeFilter: false // this will have just the page auto-refresh control show
 *         }
 *       });
 *     }
 *   }
 * });
 */
export class MonitoringViewBaseController {
  /**
   * Create a view controller
   * @param {String} title - Title of the page
   * @param {String} api - Back-end API endpoint to poll for getting the page
   *    data using POST and time range data in the body. Whenever possible, use
   *    this method for data polling rather than supply the getPageData param.
   * @param {Function} apiUrlFn - Function that returns a string for the back-end
   *    API endpoint, in case the string has dynamic query parameters (e.g.
   *    show_system_indices) rather than supply the getPageData param.
   * @param {Function} getPageData - (Optional) Function to fetch page data, if
   *    simply passing the API string isn't workable.
   * @param {Object} defaultData - Initial model data to populate
   * @param {String} reactNodeId - DOM element ID of the element for mounting
   *    the view's main React component
   * @param {Service} $injector - Angular dependency injection service
   * @param {Service} $scope - Angular view data binding service
   * @param {Boolean} options.enableTimeFilter - Whether to show the time filter
   * @param {Boolean} options.enableAutoRefresh - Whether to show the auto
   *    refresh control
   */
  constructor({
    title = '',
    api = '',
    apiUrlFn,
    getPageData: _getPageData = getPageData,
    defaultData,
    reactNodeId = null, // WIP: https://github.com/elastic/x-pack-kibana/issues/5198
    $scope,
    $injector,
    options = {},
    fetchDataImmediately = true,
  }) {
    const titleService = $injector.get('title');
    const $executor = $injector.get('$executor');
    const $window = $injector.get('$window');
    const config = $injector.get('config');

    titleService($scope.cluster, title);

    $scope.pageData = this.data = { ...defaultData };
    this._isDataInitialized = false;
    this.reactNodeId = reactNodeId;

    let deferTimer;
    let zoomInLevel = 0;

    const popstateHandler = () => zoomInLevel > 0 && --zoomInLevel;
    const removePopstateHandler = () => $window.removeEventListener('popstate', popstateHandler);
    const addPopstateHandler = () => $window.addEventListener('popstate', popstateHandler);

    this.zoomInfo = {
      zoomOutHandler: () => $window.history.back(),
      showZoomOutBtn: () => zoomInLevel > 0,
    };

    const { enableTimeFilter = true, enableAutoRefresh = true } = options;

    if (enableTimeFilter === false) {
      timefilter.disableTimeRangeSelector();
    } else {
      timefilter.enableTimeRangeSelector();
    }

    if (enableAutoRefresh === false) {
      timefilter.disableAutoRefreshSelector();
    } else {
      timefilter.enableAutoRefreshSelector();
    }

    this.updateData = () => {
      if (this.updateDataPromise) {
        // Do not sent another request if one is inflight
        // See https://github.com/elastic/kibana/issues/24082
        this.updateDataPromise.cancel();
        this.updateDataPromise = null;
      }
      const _api = apiUrlFn ? apiUrlFn() : api;
      const options = this.getPaginationRouteOptions();
      const promises = [_getPageData($injector, _api, options)];
      const setupMode = getSetupModeState();
      if (setupMode.enabled) {
        promises.push(updateSetupModeData());
      }
      this.updateDataPromise = new PromiseWithCancel(Promise.all(promises));
      return this.updateDataPromise.promise().then(([pageData]) => {
        $scope.$apply(() => {
          this._isDataInitialized = true; // render will replace loading screen with the react component
          $scope.pageData = this.data = pageData; // update the view's data with the fetch result
        });
      });
    };
    fetchDataImmediately && this.updateData();

    $executor.register({
      execute: () => this.updateData(),
    });
    $executor.start($scope);
    $scope.$on('$destroy', () => {
      clearTimeout(deferTimer);
      removePopstateHandler();
      if (this.reactNodeId) {
        // WIP https://github.com/elastic/x-pack-kibana/issues/5198
        unmountComponentAtNode(document.getElementById(this.reactNodeId));
      }
      $executor.destroy();
    });

    // needed for chart pages
    this.onBrush = ({ xaxis }) => {
      removePopstateHandler();
      const { to, from } = xaxis;
      const timezone = config.get('dateFormat:tz');
      const offset = getOffsetInMS(timezone);
      timefilter.setTime({
        from: moment(from - offset),
        to: moment(to - offset),
        mode: 'absolute',
      });
      $executor.cancel();
      $executor.run();
      ++zoomInLevel;
      clearTimeout(deferTimer);
      /*
        Needed to defer 'popstate' event, so it does not fire immediately after it's added.
        10ms is to make sure the event is not added with the same code digest
      */
      deferTimer = setTimeout(() => addPopstateHandler(), 10);
    };

    this.setTitle = title => titleService($scope.cluster, title);
  }

  renderReact(component) {
    if (this._isDataInitialized === false) {
      render(
        <I18nContext>
          <PageLoading />
        </I18nContext>,
        document.getElementById(this.reactNodeId)
      );
    } else {
      render(component, document.getElementById(this.reactNodeId));
    }
  }

  getPaginationRouteOptions() {
    return {};
  }
}
