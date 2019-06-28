/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const execa = require('execa'); // eslint-disable-line import/no-extraneous-dependencies

execa.sync('node', [require.resolve('./jest')], { stdio: 'inherit' });
execa.sync('node', [require.resolve('./mocha')], { stdio: 'inherit' });
execa.sync('node', [require.resolve('./functional_test')], { stdio: 'inherit' });
execa.sync('node', [require.resolve('./api_integration_test')], { stdio: 'inherit' });
