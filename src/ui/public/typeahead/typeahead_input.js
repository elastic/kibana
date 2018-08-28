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

import { uiModules } from '../modules';
const typeahead = uiModules.get('kibana/typeahead');

typeahead.directive('kbnTypeaheadInput', function () {
  return {
    restrict: 'A',
    require: '^kbnTypeahead',
    link: function ($scope, $el, $attr, typeahead) {
      // disable browser autocomplete
      $el.attr('autocomplete', 'off');

      $el.on('focus', () => {
        // For some reason if we don't have the $evalAsync in here, then blur events happen outside the angular lifecycle
        $scope.$evalAsync(() => typeahead.onFocus());
      });

      $el.on('blur', () => {
        $scope.$evalAsync(() => typeahead.onBlur());
      });

      $scope.$on('focus', () => {
        $el.focus();
      });

      $scope.$on('$destroy', () => {
        $el.off();
      });
    }
  };
});
