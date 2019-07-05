/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function Transition(config) {
  // The name of the transition that is stored in the page object
  this.name = config.name;

  // Use this to set a more friendly name
  this.displayName = config.displayName || this.name;

  // A sentence or few about what this element does
  this.help = config.help || '';

  // The CSS class corresponding to the page enter transition
  this.enter = config.enter || '';

  // The CSS class corresponding to the page exit transition
  this.exit = config.exit || '';
}
