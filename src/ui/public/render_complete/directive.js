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

const attributeName = 'data-render-complete';

uiModules
  .get('kibana')
  .directive('renderComplete', () => ({
    controller($scope, $element) {
      const el = $element[0];

      const start = () => {
        $element.attr(attributeName, false);
        return true;
      };

      const complete = () => {
        $element.attr(attributeName, true);
        return true;
      };

      const teardown = () => {
        el.removeEventListener('renderStart', start);
        el.removeEventListener('renderComplete', complete);
      };

      const setup = () => {
        $element.attr(attributeName, false);
        el.addEventListener('renderStart', start);
        el.addEventListener('renderComplete', complete);
        $scope.$on('$destroy', teardown);
      };

      this.disable = () => {
        $element.attr(attributeName, 'disabled');
        teardown();
      };

      setup();
    }
  }));
