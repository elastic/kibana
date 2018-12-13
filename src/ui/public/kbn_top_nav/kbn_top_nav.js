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

/**
 * A configuration object for a top nav component.
 * @typedef {Object} KbnTopNavConfig
 * @type Object
 * @property {string} key - identifier of menu item.
 * @property {string} label - A display string which will be shown in the top nav for this option.
 * @property {string} [description] - optional, used for the screen-reader description of this
 *  menu. Defaults to "Toggle ${label} view" for templated menu items and just "${label}" for
 *  programmatic menu items
 * @property {string} testId - for testing purposes, can be used to retrieve this item.
 * @property {Object} [template] - an html template that will be shown when this item is clicked.
 *  If template is not given then run should be supplied.
 * @property {function} [run] - an optional function that will be run when the nav item is clicked.
 *  Either this or template parameter should be specified.
 * @param {boolean} [hideButton] - optional, set to true to prevent a menu item from being created.
 *  This allow injecting templates into the navbar that don't have an associated template
 */

/**
 * kbnTopNav directive
 *
 * The top section that shows the timepicker, load, share and save dialogues.
 *
 * ```
 * <kbn-top-nav name="current-app-for-extensions" config="path.to.menuItems"></kbn-top-nav>
 * ```
 *
 * Menu items/templates are passed to the kbnTopNav via the config attribute
 * and should be defined as an array of objects. Each object represents a menu
 * item and should be of type kbnTopNavConfig.
 *
 * @param {Array<kbnTopNavConfig>|KbnTopNavController} config
 *
 * Programmatic control of the navbar can be achieved one of two ways
 */

import _ from 'lodash';
import angular from 'angular';
import '../watch_multi';
import '../directives/input_focus';
import { uiModules } from '../modules';
import template from './kbn_top_nav.html';
import { KbnTopNavControllerProvider } from './kbn_top_nav_controller';
import { NavBarExtensionsRegistryProvider } from '../registry/navbar_extensions';

import './bread_crumbs/bread_crumbs';

const module = uiModules.get('kibana');

module.directive('kbnTopNav', function (Private) {
  const KbnTopNavController = Private(KbnTopNavControllerProvider);
  const navbarExtensions = Private(NavBarExtensionsRegistryProvider);
  const getNavbarExtensions = _.memoize(function (name) {
    if (!name) throw new Error('navbar directive requires a name attribute');
    return _.sortBy(navbarExtensions.byAppName[name], 'order');
  });

  return {
    restrict: 'E',
    transclude: true,
    template,

    // TODO: The kbnTopNav currently requires that it share a scope with
    // its parent directive. This allows it to export the kbnTopNav controller
    // and allows the config templates to use values from the parent scope.
    //
    // Moving this to an isolate scope will require modifying the config
    // directive to support child directives, instead of templates, so that
    // parent controllers can be imported/required rather than simply referenced
    // directly in the template.
    //
    // TODO: Our fake multi-slot transclusion solution also depends on an inherited
    // scope. Moving this to an isolate scope will cause this to break.
    //
    // scope: {}

    controller($scope, $attrs, $element, $transclude) {
      // This is a semi-hacky solution to missing slot-transclusion support in Angular 1.4.7
      // (it was added as a core feature in 1.5). Borrowed from http://stackoverflow.com/a/22080765.
      $scope.transcludes = {};

      // Extract transcluded elements for use in the link function.
      $transclude(clone => {
        // We expect the transcluded elements to be wrapped in a single div.
        const transcludedContentContainer = _.find(clone, item => {
          if (item.attributes) {
            return _.find(item.attributes, attr => {
              return attr.name.indexOf('data-transclude-slots') !== -1;
            });
          }
        });

        if (!transcludedContentContainer) {
          return;
        }

        const transcludedContent = transcludedContentContainer.children;
        _.forEach(transcludedContent, transcludedItem => {
          const transclusionSlot = transcludedItem.getAttribute('data-transclude-slot');
          $scope.transcludes[transclusionSlot] = transcludedItem;
        });
      });
      const extensions = getNavbarExtensions($attrs.name);

      function initTopNav(newConfig, oldConfig) {
        if (_.isEqual(oldConfig, newConfig)) return;

        if (newConfig instanceof KbnTopNavController) {
          newConfig.addItems(extensions);
          $scope.kbnTopNav = new KbnTopNavController(newConfig);
        } else {
          newConfig = newConfig.concat(extensions);
          $scope.kbnTopNav = new KbnTopNavController(newConfig);
        }
        $scope.kbnTopNav._link($scope, $element);
      }

      const getTopNavConfig = () => {
        return _.get($scope, $attrs.config, []);
      };

      const topNavConfig = getTopNavConfig();

      // Because we store $scope and $element on the kbnTopNavController, if this was passed an instance
      // instead of a configuration, it will enter an infinite digest loop. Only watch for updates if a config
      // was passed instead. This is ugly, but without diving into a larger refactor, the smallest temporary solution
      // to get dynamic nav updates working for dashboard. Console is currently the only place that passes a
      // KbnTopNavController (and a slew of tests).
      if (!(topNavConfig instanceof KbnTopNavController)) {
        $scope.$watch(getTopNavConfig, initTopNav, true);
      }

      initTopNav(topNavConfig, null);

      return $scope.kbnTopNav;
    },

    link(scope) {
      // These are the slots where transcluded elements can go.
      const transclusionSlotNames = ['topLeftCorner', 'bottomRow'];

      // Transclude elements into specified "slots" in the top nav.
      transclusionSlotNames.forEach(name => {
        const transcludedItem = scope.transcludes[name];
        if (transcludedItem) {
          const transclusionSlot = document.querySelector(`[data-transclude-slot="${name}"]`);
          angular.element(transclusionSlot).replaceWith(transcludedItem);
        }
      });
    }
  };
});
