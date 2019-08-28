/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React from 'react';
import ReactDOM from 'react-dom';

import { metadata } from 'ui/metadata';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

import { DocumentationHelpLink } from './documentation_help_link_view';

module.directive('mlDocumentationHelpLink', function () {
  return {
    scope: {
      uri: '@mlUri',
      label: '@mlLabel'
    },
    restrict: 'AE',
    replace: true,
    link: function (scope, element) {
      const baseUrl = 'https://www.elastic.co';
      // metadata.branch corresponds to the version used in documentation links.
      const version = metadata.branch;

      function renderReactComponent() {

        const props = {
          fullUrl: `${baseUrl}/guide/en/elastic-stack-overview/${version}/${scope.uri}`,
          label: scope.label
        };

        ReactDOM.render(
          React.createElement(DocumentationHelpLink, props),
          element[0]
        );
      }

      scope.$watch('uri', renderReactComponent);
    }
  };

});
