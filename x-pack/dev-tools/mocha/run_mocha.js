/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function runMocha() {
  const debugInBand = process.execArgv.some(arg => {
    switch (arg) {
      case '--debug':
      case '--debug-brk':
      case '-d':
      case '--inspect':
      case '--inspect-brk':
        return true;
    }
  });

  if (debugInBand) {
    process.argv.push('--no-timeouts');
    require('mocha/bin/_mocha');
  } else {
    require('mocha/bin/mocha');
  }
}
