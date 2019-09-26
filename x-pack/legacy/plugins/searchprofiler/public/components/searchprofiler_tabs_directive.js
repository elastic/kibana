/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'ngreact';

import { wrapInI18nContext } from 'ui/i18n';
import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/searchprofiler', ['react']);

import { SearchProfilerTabs } from './searchprofiler_tabs';

module.directive('searchProfilerTabs', function (reactDirective) {
  return reactDirective(
    wrapInI18nContext(SearchProfilerTabs),
    undefined,
    { restrict: 'E' }
  );
});
