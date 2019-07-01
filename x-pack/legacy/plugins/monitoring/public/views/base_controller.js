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
    options = {}
  }) {
    const titleService = $injector.get('title');
    const $executor = $injector.get('$executor');

    titleService($scope.cluster, title);

    $scope.pageData = this.data = { ...defaultData };
    this._isDataInitialized = false;
    this.reactNodeId = reactNodeId;

    const {
      enableTimeFilter = true,
      enableAutoRefresh = true
    } = options;

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
      this.updateDataPromise = new PromiseWithCancel(_getPageData($injector, _api));
      return this.updateDataPromise.promise().then((pageData) => {
        $scope.$apply(() => {
          this._isDataInitialized = true; // render will replace loading screen with the react component
          $scope.pageData = this.data = pageData; // update the view's data with the fetch result
        });
      });
    };
    this.updateData();

    $executor.register({
      execute: () => this.updateData()
    });
    $executor.start($scope);
    $scope.$on('$destroy', () => {
      if (this.reactNodeId) { // WIP https://github.com/elastic/x-pack-kibana/issues/5198
        unmountComponentAtNode(document.getElementById(this.reactNodeId));
      }
      $executor.destroy();
    });

    // needed for chart pages
    this.onBrush = ({ xaxis }) => {
      const { to, from } = xaxis;
      timefilter.setTime({
        from: moment(from),
        to: moment(to),
        mode: 'absolute'
      });
    };

    this.setTitle = title => titleService($scope.cluster, title);
  }

  renderReact(component) {
    if (this._isDataInitialized === false) {
      render(<I18nContext><PageLoading /></I18nContext>, document.getElementById(this.reactNodeId));
    } else {
      render(component, document.getElementById(this.reactNodeId));
    }
  }
}
