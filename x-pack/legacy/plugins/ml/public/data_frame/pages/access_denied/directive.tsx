/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';

// @ts-ignore
import { uiModules } from 'ui/modules';
import uiChrome from 'ui/chrome';

const module = uiModules.get('apps/ml', ['react']);

import { I18nContext } from 'ui/i18n';
import { InjectorService } from '../../../../common/types/angular';

import { Page } from './page';

module.directive('mlDataFrameAccessDenied', ($injector: InjectorService) => {
  return {
    scope: {},
    restrict: 'E',
    link: (scope: ng.IScope, element: ng.IAugmentedJQuery) => {
      const kbnBaseUrl = $injector.get<string>('kbnBaseUrl');
      const kbnUrl = $injector.get<any>('kbnUrl');

      const goToKibana = () => {
        window.location.href = uiChrome.getBasePath() + kbnBaseUrl;
      };

      const retry = () => {
        kbnUrl.redirect('/data_frames');
      };

      const props = { goToKibana, retry };

      ReactDOM.render(<I18nContext>{React.createElement(Page, props)}</I18nContext>, element[0]);

      element.on('$destroy', () => {
        ReactDOM.unmountComponentAtNode(element[0]);
        scope.$destroy();
      });
    },
  };
});
