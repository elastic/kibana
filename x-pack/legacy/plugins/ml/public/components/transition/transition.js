/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import angular from 'angular';
import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module
/**
 * $transition service provides a consistent interface to trigger CSS 3 transitions and to be informed when they complete.
 * @param  {DOMElement} element  The DOMElement that will be animated.
 * @param  {string|object|function} trigger  The thing that will cause the transition to start:
 *   - As a string, it represents the css class to be added to the element.
 *   - As an object, it represents a hash of style attributes to be applied to the element.
 *   - As a function, it represents a function to be called that will cause the transition to occur.
 * @return {Promise}  A promise that is resolved when the transition finishes.
 */
  .factory('$transition', ['$q', '$timeout', '$rootScope', function ($q, $timeout, $rootScope) {
    const $transition = function (element, trigger, options) {
      options = options || {};
      const deferred = $q.defer();
      const endEventName = $transition[options.animation ? 'animationEndEventName' : 'transitionEndEventName'];

      const transitionEndHandler = function () {
        $rootScope.$apply(function () {
          element.unbind(endEventName, transitionEndHandler);
          deferred.resolve(element);
        });
      };

      if (endEventName) {
        element.bind(endEventName, transitionEndHandler);
      }

      // Wrap in a timeout to allow the browser time to update the DOM before the transition is to occur
      $timeout(function () {
        if (angular.isString(trigger)) {
          element.addClass(trigger);
        } else if (angular.isFunction(trigger)) {
          trigger(element);
        } else if (angular.isObject(trigger)) {
          element.css(trigger);
        }
        //If browser does not support transitions, instantly resolve
        if (!endEventName) {
          deferred.resolve(element);
        }
      });

      // Add our custom cancel function to the promise that is returned
      // We can call this if we are about to run a new transition, which we know will prevent this transition from ending,
      // i.e. it will therefore never raise a transitionEnd event for that transition
      deferred.promise.cancel = function () {
        if (endEventName) {
          element.unbind(endEventName, transitionEndHandler);
        }
        deferred.reject('Transition cancelled');
      };

      return deferred.promise;
    };

    // Work out the name of the transitionEnd event
    const transElement = document.createElement('trans');
    const transitionEndEventNames = {
      'WebkitTransition': 'webkitTransitionEnd',
      'MozTransition': 'transitionend',
      'OTransition': 'oTransitionEnd',
      'transition': 'transitionend'
    };
    const animationEndEventNames = {
      'WebkitTransition': 'webkitAnimationEnd',
      'MozTransition': 'animationend',
      'OTransition': 'oAnimationEnd',
      'transition': 'animationend'
    };
    function findEndEventName(endEventNames) {
      for (const name in endEventNames) {
        if (transElement.style[name] !== undefined) {
          return endEventNames[name];
        }
      }
    }
    $transition.transitionEndEventName = findEndEventName(transitionEndEventNames);
    $transition.animationEndEventName = findEndEventName(animationEndEventNames);
    return $transition;
  }]);
