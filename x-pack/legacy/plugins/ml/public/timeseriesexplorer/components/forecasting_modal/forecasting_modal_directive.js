/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import 'ngreact';

import { wrapInI18nContext } from 'ui/i18n';
import { timefilter } from 'ui/timefilter';
import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import { ForecastingModal } from './forecasting_modal';

module.directive('mlForecastingModal', function ($injector) {
  const reactDirective = $injector.get('reactDirective');
  return reactDirective(
    wrapInI18nContext(ForecastingModal),
    // reactDirective service requires for react component to have propTypes, but injectI18n doesn't copy propTypes from wrapped component.
    // That's why we pass propTypes directly to reactDirective service.
    Object.keys(ForecastingModal.WrappedComponent.propTypes || {}),
    { restrict: 'E' },
    { timefilter }
  );
});
