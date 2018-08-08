/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

module.exports = function logger() {
  const DEBUG = process.env.DEBUG || false;

  if (!DEBUG) return;
  console.log.apply(console, arguments);
};