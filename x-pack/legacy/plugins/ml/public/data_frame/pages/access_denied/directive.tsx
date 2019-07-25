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
import chrome from 'ui/chrome';
import { timefilter } from 'ui/timefilter';
import { timeHistory } from 'ui/timefilter/time_history';
import { InjectorService } from '../../../../common/types/angular';

import { NavigationMenuContext } from '../../../util/context_utils';

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

      ReactDOM.render(
        <I18nContext>
          <NavigationMenuContext.Provider value={{ chrome, timefilter, timeHistory }}>
            <Page goToKibana={goToKibana} retry={retry} />
          </NavigationMenuContext.Provider>
        </I18nContext>,
        element[0]
      );

      element.on('$destroy', () => {
        ReactDOM.unmountComponentAtNode(element[0]);
        scope.$destroy();
      });
    },
  };
});
