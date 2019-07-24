/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// bluebird < v3.3.5 does not work with MutationObserver polyfill
// when MutationObserver exists, bluebird avoids using node's builtin async schedulers
// x-pack has a different version of bluebird so it needs its own polyfills.js to ensure
// the scheduler is set on the right bluebird instance
const bluebird = require('bluebird');
bluebird.Promise.setScheduler(function (fn) { global.setImmediate.call(global, fn); });

const MutationObserver = require('mutation-observer');
// There's a bug in mutation-observer around the `attributes` option
// https://dom.spec.whatwg.org/#mutationobserver
// If either options's attributeOldValue or attributeFilter is present and options's attributes is omitted, then set options's attributes to true.
const _observe = MutationObserver.prototype.observe;
MutationObserver.prototype.observe = function observe(target, options) {
  const needsAttributes = options.hasOwnProperty('attributeOldValue') || options.hasOwnProperty('attributeFilter');
  if (needsAttributes && !options.hasOwnProperty('attributes')) {
    options.attributes = true;
  }
  Function.prototype.call(_observe, this, target, options);
};
Object.defineProperty(window, 'MutationObserver', { value: MutationObserver });
