/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


const assert = require('assert');
const bindingPath = require.resolve(`./build/Release/binding`);
const binding = require(bindingPath);
assert.strictEqual(binding.hello(), 'world');
console.log('binding.hello() =', binding.hello());
