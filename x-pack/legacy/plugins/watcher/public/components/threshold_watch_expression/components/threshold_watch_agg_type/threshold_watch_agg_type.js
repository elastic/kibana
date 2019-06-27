/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { i18n } from '@kbn/i18n';
import template from './threshold_watch_agg_type.html';
import { ThresholdWatchBaseController } from '../threshold_watch_base';
import 'plugins/watcher/services/html_id_generator';
import 'plugins/watcher/components/xpack_aria_describes';

const app = uiModules.get('xpack/watcher');

app.directive('thresholdWatchAggType', function ($injector) {
  const htmlIdGeneratorFactory = $injector.get('xpackWatcherHtmlIdGeneratorFactory');

  return {
    restrict: 'E',
    template: template,
    scope: {
      itemId: '@',
      aggTypes: '=',
      aggType: '=',
      isOpen: '=',
      isVisible: '=',
      onOpen: '=',
      onClose: '=',
      onChange: '=',
      onValid: '=',
      onInvalid: '=',
      onDirty: '=',
      onPristine: '='
    },
    bindToController: true,
    controllerAs: 'thresholdWatchAggType',
    controller: class ThresholdWatchAggTypeController extends ThresholdWatchBaseController {
      initAfterBindings($scope) {
        this.makeId = htmlIdGeneratorFactory.create();

        $scope.$watch('thresholdWatchAggType.aggType', this.onChange);

        $scope.$watch('thresholdWatchAggType.form.$valid', this.checkValidity);
        $scope.$watch('thresholdWatchAggType.form.$dirty', this.checkDirty);

        this.itemDescription = i18n.translate('xpack.watcher.thresholdWatchExpression.aggType.itemDescription', {
          defaultMessage: 'When',
        });
      }

      get itemValue() {
        return this.aggType ? this.aggType.label : '';
      }
    }
  };
});
