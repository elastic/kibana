/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { uiModules } from 'ui/modules';
import { BeatsOverview } from 'plugins/monitoring/components/beats/overview';
import { I18nContext } from 'ui/i18n';

const uiModule = uiModules.get('monitoring/directives', []);
uiModule.directive('monitoringBeatsOverview', () => {
  return {
    restrict: 'E',
    scope: {
      data: '=',
      onBrush: '<',
      zoomInfo: '<',
    },
    link(scope, $el) {
      scope.$on('$destroy', () => $el && $el[0] && unmountComponentAtNode($el[0]));

      scope.$watch('data', (data = {}) => {
        render(
          <I18nContext>
            <BeatsOverview {...data} onBrush={scope.onBrush} zoomInfo={scope.zoomInfo} />
          </I18nContext>,
          $el[0]
        );
      });
    },
  };
});
