/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { AggConfig } from '../../agg_config';
import { uiModules } from '../../../modules';
import aggAddTemplate from './agg_add.html';

uiModules
  .get('kibana')
  .directive('visEditorAggAdd', function () {

    return {
      restrict: 'E',
      template: aggAddTemplate,
      controllerAs: 'add',
      controller: function ($scope) {
        const self = this;

        self.form = false;
        self.submit = function (schema) {
          self.form = false;

          const aggConfig = new AggConfig($scope.vis, {
            schema: schema
          });
          aggConfig.brandNew = true;

          $scope.vis.aggs.push(aggConfig);
        };
      }
    };
  });
