/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// create a property descriptor for properties
// that won't change
function describeConst(val) {
  return {
    writable: false,
    enumerable: false,
    configurable: false,
    value: val,
  };
}

/**
 * Apply inheritance in the legacy `_.class(SubClass).inherits(SuperClass)`
 * @param  {Function} SubClass class that should inherit SuperClass
 * @param  {Function} SuperClass
 * @return {Function}
 */
export function inherits(SubClass, SuperClass) {
  const prototype = Object.create(SuperClass.prototype, {
    constructor: describeConst(SubClass),
    superConstructor: describeConst(SuperClass),
  });

  Object.defineProperties(SubClass, {
    prototype: describeConst(prototype),
    Super: describeConst(SuperClass),
  });

  return SubClass;
}
