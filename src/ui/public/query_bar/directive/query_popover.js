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

import React from 'react';
import ReactDOM from 'react-dom';
import { uiModules } from '../../modules';
import { documentationLinks } from '../../documentation_links/documentation_links';
import {
  EuiPopover,
  EuiButtonEmpty,
  EuiForm,
  EuiFormRow,
  EuiSwitch,
  EuiLink,
  EuiText,
  EuiSpacer,
  EuiHorizontalRule,
  EuiPopoverTitle,
} from '@elastic/eui';

const luceneQuerySyntaxDocs = documentationLinks.query.luceneQuerySyntax;
const kueryQuerySyntaxDocs = documentationLinks.query.kueryQuerySyntax;

const module = uiModules.get('app/kibana', ['react']);
module.directive('queryPopover', function (localStorage) {

  return {
    restrict: 'E',
    scope: {
      language: '<',
      onSelectLanguage: '&',
    },
    link: function ($scope, $element) {
      $scope.isPopoverOpen = false;

      function togglePopover() {
        $scope.$evalAsync(() => {
          $scope.isPopoverOpen = !$scope.isPopoverOpen;
        });
      }

      function closePopover() {
        $scope.$evalAsync(() => {
          $scope.isPopoverOpen = false;
        });
      }

      function onSwitchChange() {
        $scope.$evalAsync(() => {
          const newLanguage = $scope.language === 'lucene' ? 'kuery' : 'lucene';
          localStorage.set('kibana.userQueryLanguage', newLanguage);
          $scope.onSelectLanguage({ $language: newLanguage });
        });
      }

      function render() {
        const button = (
          <EuiButtonEmpty
            size="xs"
            onClick={togglePopover}
          >
            Options
          </EuiButtonEmpty>
        );

        const popover = (
          <EuiPopover
            id="popover"
            ownFocus
            anchorPosition="downRight"
            button={button}
            isOpen={$scope.isPopoverOpen}
            closePopover={closePopover}
            withTitle
          >
            <EuiPopoverTitle>Syntax options</EuiPopoverTitle>
            <div style={{ width: '350px' }}>
              <EuiText>
                <p>
                  Our experimental autocomplete and simple syntax features can help you create your queries. Just start
                  typing and you’ll see matches related to your data.

                  See docs {(
                    <EuiLink
                      href={kueryQuerySyntaxDocs}
                      target="_blank"
                    >
                    here
                    </EuiLink>
                  )}.
                </p>
              </EuiText>

              <EuiSpacer size="m" />

              <EuiForm>
                <EuiFormRow>
                  <EuiSwitch
                    id="queryEnhancementOptIn"
                    name="popswitch"
                    label="Turn on query features"
                    checked={$scope.language === 'kuery'}
                    onChange={onSwitchChange}
                  />
                </EuiFormRow>
              </EuiForm>

              <EuiHorizontalRule margin="s" />

              <EuiText size="xs">
                <p>
                  Not ready yet? Find our lucene docs {(
                    <EuiLink
                      href={luceneQuerySyntaxDocs}
                      target="_blank"
                    >
                    here
                    </EuiLink>
                  )}.
                </p>
              </EuiText>
            </div>
          </EuiPopover>
        );

        ReactDOM.render(popover, $element[0]);
      }

      $scope.$watch('isPopoverOpen', render);
      $scope.$watch('language', render);
    }
  };

});


